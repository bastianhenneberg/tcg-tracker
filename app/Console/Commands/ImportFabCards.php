<?php

namespace App\Console\Commands;

use App\Models\Card;
use App\Models\CardGame;
use App\Models\CardPrinting;
use App\Models\CardSet;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\LazyCollection;

class ImportFabCards extends Command
{
    protected $signature = 'tcg:import-fab
                            {path : Path to the card-flattened.json file}
                            {--fresh : Clear existing FaB data before import}';

    protected $description = 'Import Flesh and Blood cards from the flattened JSON file';

    private CardGame $cardGame;

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

        $this->createOrGetCardGame();

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
                ['Sets', CardSet::where('card_game_id', $this->cardGame->id)->count()],
                ['Cards', Card::where('card_game_id', $this->cardGame->id)->count()],
                ['Printings', CardPrinting::whereHas('card', fn ($q) => $q->where('card_game_id', $this->cardGame->id))->count()],
            ]
        );

        return self::SUCCESS;
    }

    private function clearExistingData(): void
    {
        $cardGame = CardGame::where('slug', 'fab')->first();

        if ($cardGame) {
            $cardGame->delete();
        }
    }

    private function createOrGetCardGame(): void
    {
        $this->cardGame = CardGame::firstOrCreate(
            ['slug' => 'fab'],
            ['name' => 'Flesh and Blood', 'is_active' => true]
        );

        $this->info("Using card game: {$this->cardGame->name}");

        // Pre-load existing sets and cards into memory for faster lookups
        $this->setIds = CardSet::where('card_game_id', $this->cardGame->id)
            ->pluck('id', 'external_id')
            ->toArray();

        $this->cardIds = Card::where('card_game_id', $this->cardGame->id)
            ->pluck('id', 'external_id')
            ->toArray();
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
        $this->createPrinting($cardId, $setId, $item);
    }

    private function getOrCreateSetId(string $externalId): int
    {
        if (isset($this->setIds[$externalId])) {
            return $this->setIds[$externalId];
        }

        $set = CardSet::create([
            'card_game_id' => $this->cardGame->id,
            'external_id' => $externalId,
            'name' => $externalId,
        ]);

        $this->setIds[$externalId] = $set->id;

        return $set->id;
    }

    private function getOrCreateCardId(array $item): int
    {
        $externalId = $item['unique_id'];

        if (isset($this->cardIds[$externalId])) {
            return $this->cardIds[$externalId];
        }

        $card = Card::create([
            'card_game_id' => $this->cardGame->id,
            'external_id' => $externalId,
            'name' => $item['name'],
            'data' => $this->extractCardData($item),
        ]);

        $this->cardIds[$externalId] = $card->id;

        return $card->id;
    }

    private function extractCardData(array $item): array
    {
        return [
            'color' => $item['color'] ?? null,
            'pitch' => $item['pitch'] ?? null,
            'cost' => $item['cost'] ?? null,
            'power' => $item['power'] ?? null,
            'defense' => $item['defense'] ?? null,
            'health' => $item['health'] ?? null,
            'intelligence' => $item['intelligence'] ?? null,
            'arcane' => $item['arcane'] ?? null,
            'types' => $item['types'] ?? [],
            'traits' => $item['traits'] ?? [],
            'card_keywords' => $item['card_keywords'] ?? [],
            'abilities_and_effects' => $item['abilities_and_effects'] ?? [],
            'functional_text' => $item['functional_text'] ?? null,
            'functional_text_plain' => $item['functional_text_plain'] ?? null,
            'type_text' => $item['type_text'] ?? null,
            'played_horizontally' => $item['played_horizontally'] ?? false,
            'blitz_legal' => $item['blitz_legal'] ?? false,
            'cc_legal' => $item['cc_legal'] ?? false,
            'commoner_legal' => $item['commoner_legal'] ?? false,
            'll_legal' => $item['ll_legal'] ?? false,
        ];
    }

    private function createPrinting(int $cardId, int $setId, array $item): void
    {
        CardPrinting::firstOrCreate(
            [
                'card_id' => $cardId,
                'external_id' => $item['printing_unique_id'],
            ],
            [
                'card_set_id' => $setId,
                'collector_number' => $item['id'] ?? null,
                'rarity' => $item['rarity'] ?? null,
                'foiling' => $item['foiling'] ?? null,
                'language' => $this->extractLanguage($item),
                'image_url' => $item['image_url'] ?? null,
                'data' => $this->extractPrintingData($item),
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

    private function extractPrintingData(array $item): array
    {
        return [
            'edition' => $item['edition'] ?? null,
            'expansion_slot' => $item['expansion_slot'] ?? false,
            'artists' => $item['artists'] ?? [],
            'art_variations' => $item['art_variations'] ?? [],
            'flavor_text' => $item['flavor_text'] ?? null,
            'flavor_text_plain' => $item['flavor_text_plain'] ?? null,
            'image_rotation_degrees' => $item['image_rotation_degrees'] ?? 0,
            'tcgplayer_product_id' => $item['tcgplayer_product_id'] ?? null,
            'tcgplayer_url' => $item['tcgplayer_url'] ?? null,
        ];
    }
}
