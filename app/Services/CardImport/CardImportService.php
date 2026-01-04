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
        // Add more mappers here as they are created:
        // $this->registerMapper(new MtgCardImportMapper());
        // $this->registerMapper(new OpCardImportMapper());
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

        // Try to find existing card by external ID or name
        $existingCard = UnifiedCard::query()
            ->where('game', $mapped['game'])
            ->where(function ($query) use ($identifier, $mapped) {
                $query->whereJsonContains('external_ids->fab_id', $identifier)
                    ->orWhere('name', $mapped['name']);
            })
            ->first();

        if ($existingCard) {
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
}
