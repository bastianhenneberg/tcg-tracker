<?php

namespace App\Services\CardImport;

use App\Contracts\CardImport\CardImportMapperInterface;
use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use App\Models\UnifiedSet;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CardImportService
{
    /** @var array<string, CardImportMapperInterface> */
    protected array $mappers = [];

    public function __construct()
    {
        $this->registerMapper(new FabCardImportMapper);
        $this->registerMapper(new MtgCardImportMapper);
        $this->registerMapper(new OpCardImportMapper);
        $this->registerMapper(new RiftboundCardImportMapper);
        $this->registerMapper(new PokemonCardImportMapper);
        $this->registerMapper(new YugiohCardImportMapper);
    }

    public function registerMapper(CardImportMapperInterface $mapper): void
    {
        $this->mappers[$mapper->getGameSlug()] = $mapper;
    }

    public function getMapper(string $gameSlug): ?CardImportMapperInterface
    {
        return $this->mappers[$gameSlug] ?? null;
    }

    public function getAvailableMappers(): array
    {
        return array_keys($this->mappers);
    }

    /**
     * Import sets from external data.
     *
     * @param  array<array<string, mixed>>  $setsData
     * @return Collection<UnifiedSet>
     */
    public function importSets(string $gameSlug, array $setsData): Collection
    {
        $mapper = $this->getMapper($gameSlug);
        if (! $mapper) {
            throw new \InvalidArgumentException("No mapper found for game: {$gameSlug}");
        }

        $importedSets = collect();

        DB::transaction(function () use ($mapper, $setsData, &$importedSets) {
            foreach ($setsData as $setData) {
                $mapped = $mapper->mapSet($setData);

                $set = UnifiedSet::updateOrCreate(
                    [
                        'game' => $mapped['game'],
                        'code' => $mapped['code'],
                    ],
                    $mapped
                );

                $importedSets->push($set);
            }
        });

        return $importedSets;
    }

    /**
     * Import cards with their printings from external data.
     *
     * @param  array<array<string, mixed>>  $cardsData
     * @return array{cards: int, printings: int}
     */
    public function importCards(string $gameSlug, array $cardsData): array
    {
        $mapper = $this->getMapper($gameSlug);
        if (! $mapper) {
            throw new \InvalidArgumentException("No mapper found for game: {$gameSlug}");
        }

        $stats = ['cards' => 0, 'printings' => 0];

        DB::transaction(function () use ($mapper, $cardsData, &$stats) {
            foreach ($cardsData as $cardData) {
                if (! $mapper->isValidCard($cardData)) {
                    continue;
                }

                // Import or update card
                $card = $this->importCard($mapper, $cardData);
                $stats['cards']++;

                // Import printings if present
                $printingsData = $cardData['printings'] ?? [$cardData];
                foreach ($printingsData as $printingData) {
                    $this->importPrinting($mapper, $printingData, $card);
                    $stats['printings']++;
                }
            }
        });

        return $stats;
    }

    /**
     * Import a single card.
     */
    protected function importCard(CardImportMapperInterface $mapper, array $cardData): UnifiedCard
    {
        $mapped = $mapper->mapCard($cardData);
        $identifier = $mapper->extractCardIdentifier($cardData);
        $gameSlug = $mapper->getGameSlug();

        // Get game-specific external ID keys
        $externalIdKeys = match ($gameSlug) {
            'fab' => ['fab_id'],
            'mtg' => ['oracle_id', 'scryfall_id'],
            'onepiece' => ['op_id'],
            'riftbound' => ['riftbound_id'],
            'pokemon' => ['pokemon_tcg_id'],
            'yugioh' => ['ygoprodeck_id'],
            default => [],
        };

        // Games where cards with same name but different attributes are different cards
        // (e.g., FAB cards with different pitch values are different cards)
        $noNameFallbackGames = ['fab'];

        // Build query to find existing card by external IDs (and optionally name)
        $existingCard = UnifiedCard::query()
            ->where('game', $mapped['game'])
            ->where(function ($query) use ($identifier, $mapped, $gameSlug, $externalIdKeys, $noNameFallbackGames) {
                // Check game-specific external IDs
                foreach ($externalIdKeys as $key) {
                    $query->orWhereJsonContains("external_ids->{$key}", $identifier);
                }

                // Fallback to name matching (only for games that support it)
                // FAB cards with same name but different pitch are different cards
                if (! in_array($gameSlug, $noNameFallbackGames)) {
                    $query->orWhere('name', $mapped['name']);
                }
            })
            ->first();

        if ($existingCard) {
            // Merge external_ids from different sources
            $mergedExternalIds = array_merge(
                $existingCard->external_ids ?? [],
                $mapped['external_ids'] ?? []
            );
            $mapped['external_ids'] = $mergedExternalIds;

            $existingCard->update($mapped);

            return $existingCard;
        }

        return UnifiedCard::create($mapped);
    }

    /**
     * Import a single printing.
     */
    protected function importPrinting(
        CardImportMapperInterface $mapper,
        array $printingData,
        UnifiedCard $card
    ): UnifiedPrinting {
        // Find associated set
        $setCode = $printingData['set_id'] ?? null;
        $set = $setCode
            ? UnifiedSet::where('game', $mapper->getGameSlug())
                ->where('code', $setCode)
                ->first()
            : null;

        $mapped = $mapper->mapPrinting($printingData, $card, $set);

        // Find existing printing
        $existingPrinting = UnifiedPrinting::query()
            ->where('card_id', $card->id)
            ->where('set_code', $mapped['set_code'])
            ->where('collector_number', $mapped['collector_number'])
            ->where('finish', $mapped['finish'])
            ->where('language', $mapped['language'])
            ->first();

        if ($existingPrinting) {
            $existingPrinting->update($mapped);

            return $existingPrinting;
        }

        return UnifiedPrinting::create($mapped);
    }

    /**
     * Import from JSON file.
     */
    public function importFromJsonFile(string $gameSlug, string $filePath): array
    {
        if (! file_exists($filePath)) {
            throw new \InvalidArgumentException("File not found: {$filePath}");
        }

        // For large files, use streaming
        $fileSize = filesize($filePath);
        if ($fileSize > 10 * 1024 * 1024) { // > 10MB
            return $this->importFromLargeJsonFile($gameSlug, $filePath);
        }

        $content = file_get_contents($filePath);
        $data = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Invalid JSON file: '.json_last_error_msg());
        }

        // Detect data structure
        if (isset($data['sets'])) {
            $this->importSets($gameSlug, $data['sets']);
        }

        if (isset($data['cards'])) {
            return $this->importCards($gameSlug, $data['cards']);
        }

        // Assume array of cards at root level
        if (isset($data[0])) {
            return $this->importCards($gameSlug, $data);
        }

        throw new \InvalidArgumentException('Unknown data structure in JSON file');
    }

    /**
     * Import from large JSON file using streaming.
     */
    public function importFromLargeJsonFile(string $gameSlug, string $filePath): array
    {
        $mapper = $this->getMapper($gameSlug);
        if (! $mapper) {
            throw new \InvalidArgumentException("No mapper found for game: {$gameSlug}");
        }

        $stats = ['cards' => 0, 'printings' => 0];

        $handle = fopen($filePath, 'r');
        if (! $handle) {
            throw new \InvalidArgumentException("Cannot open file: {$filePath}");
        }

        $buffer = '';
        $inObject = false;
        $inString = false;
        $escaped = false;
        $depth = 0;
        $chunk = [];
        $chunkSize = 100;

        while (! feof($handle)) {
            $char = fgetc($handle);

            // Track string boundaries (ignore braces inside strings)
            if ($char === '"' && ! $escaped) {
                $inString = ! $inString;
            }

            // Track escape sequences
            $escaped = ($char === '\\' && ! $escaped);

            // Only count braces outside of strings
            if (! $inString) {
                if ($char === '{') {
                    $inObject = true;
                    $depth++;
                }

                if ($char === '}') {
                    $depth--;
                }
            }

            if ($inObject) {
                $buffer .= $char;
            }

            if ($depth === 0 && $inObject && ! $inString) {
                $inObject = false;
                $item = json_decode($buffer, true);
                $buffer = '';

                if ($item && $mapper->isValidCard($item)) {
                    $chunk[] = $item;

                    if (count($chunk) >= $chunkSize) {
                        $chunkStats = $this->importCards($gameSlug, $chunk);
                        $stats['cards'] += $chunkStats['cards'];
                        $stats['printings'] += $chunkStats['printings'];
                        $chunk = [];
                    }
                }
            }
        }

        // Process remaining items
        if (! empty($chunk)) {
            $chunkStats = $this->importCards($gameSlug, $chunk);
            $stats['cards'] += $chunkStats['cards'];
            $stats['printings'] += $chunkStats['printings'];
        }

        fclose($handle);

        return $stats;
    }
}
