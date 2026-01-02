<?php

namespace App\Console\Commands;

use App\Models\Fab\FabCard;
use App\Models\Fab\FabPrinting;
use App\Models\Fab\FabSet;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\LazyCollection;

class ImportFabCards extends Command
{
    protected $signature = 'tcg:import-fab
                            {path : Path to the card-flattened.json file}
                            {--fresh : Clear existing FaB data before import}';

    protected $description = 'Import Flesh and Blood cards from the flattened JSON file';

    /** @var array<string, int> */
    private array $setIds = [];

    /** @var array<string, int> */
    private array $cardIds = [];

    public function handle(): int
    {
        $path = $this->argument('path');

        if (! file_exists($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        // Increase memory limit for large JSON file
        ini_set('memory_limit', '1G');

        if ($this->option('fresh')) {
            $this->warn('Clearing existing Flesh and Blood data...');
            $this->clearExistingData();
        }

        $this->preloadExistingData();

        $this->info('Reading JSON file...');
        $data = json_decode(file_get_contents($path), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->error('Invalid JSON: '.json_last_error_msg());

            return self::FAILURE;
        }

        $this->info('Found '.count($data).' card printings');
        $this->importCards($data);

        // Free memory
        unset($data);

        $this->newLine();
        $this->info('Import completed successfully!');
        $this->table(
            ['Entity', 'Count'],
            [
                ['Sets', FabSet::count()],
                ['Cards', FabCard::count()],
                ['Printings', FabPrinting::count()],
            ]
        );

        return self::SUCCESS;
    }

    private function clearExistingData(): void
    {
        // Delete in correct order due to foreign keys
        FabPrinting::query()->delete();
        FabCard::query()->delete();
        FabSet::query()->delete();
    }

    private function preloadExistingData(): void
    {
        $this->info('Loading existing data into cache...');

        $this->setIds = FabSet::pluck('id', 'external_id')->toArray();
        $this->cardIds = FabCard::pluck('id', 'external_id')->toArray();

        $this->info(sprintf('Cached %d sets and %d cards', count($this->setIds), count($this->cardIds)));
    }

    private function importCards(array $data): void
    {
        $bar = $this->output->createProgressBar(count($data));
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% %elapsed:6s%');
        $bar->start();

        // Process in chunks of 500 to reduce transaction overhead
        LazyCollection::make($data)
            ->chunk(500)
            ->each(function ($chunk) use ($bar) {
                DB::transaction(function () use ($chunk, $bar) {
                    foreach ($chunk as $item) {
                        $this->processCardPrinting($item);
                        $bar->advance();
                    }
                });
            });

        $bar->finish();
    }

    private function processCardPrinting(array $item): void
    {
        $setId = $this->getOrCreateSetId($item['set_id']);
        $cardId = $this->getOrCreateCardId($item);
        $this->createOrUpdatePrinting($cardId, $setId, $item);
    }

    private function getOrCreateSetId(string $externalId): int
    {
        if (isset($this->setIds[$externalId])) {
            return $this->setIds[$externalId];
        }

        $set = FabSet::updateOrCreate(
            ['external_id' => $externalId],
            ['name' => $externalId]
        );

        $this->setIds[$externalId] = $set->id;

        return $set->id;
    }

    private function getOrCreateCardId(array $item): int
    {
        $externalId = $item['unique_id'];

        $cardData = [
            'name' => $item['name'],
            'color' => $item['color'] ?? null,
            'pitch' => ! empty($item['pitch']) ? (int) $item['pitch'] : null,
            'cost' => $item['cost'] ?? null,
            'power' => $item['power'] ?? null,
            'defense' => $item['defense'] ?? null,
            'health' => ! empty($item['health']) ? (int) $item['health'] : null,
            'intelligence' => ! empty($item['intelligence']) ? (int) $item['intelligence'] : null,
            'arcane' => ! empty($item['arcane']) ? (int) $item['arcane'] : null,
            'types' => $item['types'] ?? [],
            'traits' => $item['traits'] ?? [],
            'card_keywords' => $item['card_keywords'] ?? [],
            'abilities_and_effects' => $item['abilities_and_effects'] ?? [],
            'functional_text' => $item['functional_text'] ?? null,
            'functional_text_plain' => $item['functional_text_plain'] ?? null,
            'type_text' => $item['type_text'] ?? null,
            'played_horizontally' => $item['played_horizontally'] ?? false,
            // Blitz
            'blitz_legal' => $item['blitz_legal'] ?? false,
            'blitz_banned' => $item['blitz_banned'] ?? false,
            'blitz_suspended' => $item['blitz_suspended'] ?? false,
            'blitz_living_legend' => $item['blitz_living_legend'] ?? false,
            // Classic Constructed
            'cc_legal' => $item['cc_legal'] ?? false,
            'cc_banned' => $item['cc_banned'] ?? false,
            'cc_suspended' => $item['cc_suspended'] ?? false,
            'cc_living_legend' => $item['cc_living_legend'] ?? false,
            // Commoner
            'commoner_legal' => $item['commoner_legal'] ?? false,
            'commoner_banned' => $item['commoner_banned'] ?? false,
            'commoner_suspended' => $item['commoner_suspended'] ?? false,
            // Living Legend
            'll_legal' => $item['ll_legal'] ?? false,
            'll_banned' => $item['ll_banned'] ?? false,
            'll_restricted' => $item['ll_restricted'] ?? false,
            // Silver Age
            'silver_age_legal' => $item['silver_age_legal'] ?? false,
            'silver_age_banned' => $item['silver_age_banned'] ?? false,
            // Ultimate Pit Fight
            'upf_banned' => $item['upf_banned'] ?? false,
        ];

        // If cached, update the existing card
        if (isset($this->cardIds[$externalId])) {
            FabCard::where('id', $this->cardIds[$externalId])->update($cardData);

            return $this->cardIds[$externalId];
        }

        // Create or update the card
        $card = FabCard::updateOrCreate(
            ['external_id' => $externalId],
            $cardData
        );

        $this->cardIds[$externalId] = $card->id;

        return $card->id;
    }

    private function createOrUpdatePrinting(int $cardId, int $setId, array $item): void
    {
        FabPrinting::updateOrCreate(
            [
                'external_id' => $item['printing_unique_id'],
            ],
            [
                'fab_card_id' => $cardId,
                'fab_set_id' => $setId,
                'collector_number' => $item['id'] ?? null,
                'rarity' => $item['rarity'] ?? null,
                'foiling' => $item['foiling'] ?? null,
                'language' => $this->extractLanguage($item),
                'edition' => $item['edition'] ?? null,
                'image_url' => $item['image_url'] ?? null,
                'artists' => $item['artists'] ?? [],
                'flavor_text' => $item['flavor_text'] ?? null,
                'flavor_text_plain' => $item['flavor_text_plain'] ?? null,
                'tcgplayer_product_id' => $item['tcgplayer_product_id'] ?? null,
                'tcgplayer_url' => $item['tcgplayer_url'] ?? null,
            ]
        );
    }

    private function extractLanguage(array $item): string
    {
        // Check for direct language field
        if (! empty($item['language'])) {
            return strtoupper(substr($item['language'], 0, 2));
        }

        // Extract from tcgplayer_url (e.g., "?Language=English")
        if (! empty($item['tcgplayer_url'])) {
            if (preg_match('/Language=(\w+)/', $item['tcgplayer_url'], $matches)) {
                return match (strtolower($matches[1])) {
                    'english' => 'EN',
                    'german', 'deutsch' => 'DE',
                    'french', 'français' => 'FR',
                    'spanish', 'español' => 'ES',
                    'italian', 'italiano' => 'IT',
                    'japanese' => 'JP',
                    'chinese' => 'CN',
                    'korean' => 'KR',
                    default => 'EN',
                };
            }
        }

        return 'EN';
    }
}
