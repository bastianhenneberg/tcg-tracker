<?php

namespace App\Console\Commands;

use App\Models\Game;
use App\Models\Mtg\MtgCard;
use App\Models\Mtg\MtgPrinting;
use App\Models\Mtg\MtgSet;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportMtgCards extends Command
{
    protected $signature = 'tcg:import-mtg
                            {path : Path to the AllPrintings.json file}
                            {--fresh : Clear existing MTG data before import}
                            {--sets=* : Only import specific sets (by code)}';

    protected $description = 'Import Magic: The Gathering cards from MTGJSON AllPrintings.json';

    /** @var array<string, int> */
    private array $setIds = [];

    /** @var array<string, int> */
    private array $cardIds = [];

    private ?int $gameId = null;

    public function handle(): int
    {
        $path = $this->argument('path');

        if (! file_exists($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        // Increase memory limit for large JSON file
        ini_set('memory_limit', '4G');

        // Get or create MTG game
        $this->gameId = $this->getOrCreateMtgGame();

        if ($this->option('fresh')) {
            $this->warn('Clearing existing Magic: The Gathering data...');
            $this->clearExistingData();
        }

        $this->preloadExistingData();

        $this->info('Reading JSON file (this may take a while for large files)...');

        // Use streaming JSON parser for large files
        $handle = fopen($path, 'r');
        if (! $handle) {
            $this->error("Could not open file: {$path}");

            return self::FAILURE;
        }

        $data = json_decode(file_get_contents($path), true);
        fclose($handle);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->error('Invalid JSON: '.json_last_error_msg());

            return self::FAILURE;
        }

        if (! isset($data['data'])) {
            $this->error('Invalid AllPrintings format: missing "data" key');

            return self::FAILURE;
        }

        $setsToImport = $this->option('sets');
        $allSets = array_keys($data['data']);

        if (! empty($setsToImport)) {
            $allSets = array_filter($allSets, fn ($code) => in_array($code, $setsToImport));
            $this->info('Importing '.count($allSets).' specified sets');
        } else {
            $this->info('Found '.count($allSets).' sets to import');
        }

        $totalCards = 0;
        foreach ($allSets as $setCode) {
            if (isset($data['data'][$setCode]['cards'])) {
                $totalCards += count($data['data'][$setCode]['cards']);
            }
        }
        $this->info("Total card printings to process: {$totalCards}");

        $bar = $this->output->createProgressBar($totalCards);
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% %elapsed:6s% - %message%');
        $bar->setMessage('Starting...');
        $bar->start();

        foreach ($allSets as $setCode) {
            $setData = $data['data'][$setCode];
            $bar->setMessage("Processing {$setCode}...");

            // Create or update the set
            $setId = $this->getOrCreateSetId($setCode, $setData);

            // Process cards in smaller chunks to avoid SQLite deadlocks
            if (isset($setData['cards']) && is_array($setData['cards'])) {
                $cards = $setData['cards'];
                $chunks = array_chunk($cards, 100); // Smaller chunks for SQLite

                foreach ($chunks as $chunk) {
                    $this->processChunkWithRetry($chunk, $setId, $bar);
                }
            }
        }

        $bar->setMessage('Done!');
        $bar->finish();

        // Free memory
        unset($data);

        $this->newLine(2);
        $this->info('Import completed successfully!');
        $this->table(
            ['Entity', 'Count'],
            [
                ['Sets', MtgSet::count()],
                ['Cards (Oracle)', MtgCard::count()],
                ['Printings', MtgPrinting::count()],
            ]
        );

        return self::SUCCESS;
    }

    private function getOrCreateMtgGame(): int
    {
        $game = Game::firstOrCreate(
            ['slug' => 'magic-the-gathering'],
            [
                'name' => 'Magic: The Gathering',
                'description' => 'The original trading card game by Wizards of the Coast',
                'is_official' => true,
            ]
        );

        return $game->id;
    }

    private function clearExistingData(): void
    {
        MtgPrinting::query()->delete();
        MtgCard::query()->delete();
        MtgSet::query()->delete();
    }

    private function preloadExistingData(): void
    {
        $this->info('Loading existing data into cache...');

        $this->setIds = MtgSet::pluck('id', 'code')->toArray();
        $this->cardIds = MtgCard::pluck('id', 'oracle_id')->toArray();

        $this->info(sprintf('Cached %d sets and %d oracle cards', count($this->setIds), count($this->cardIds)));
    }

    private function getOrCreateSetId(string $setCode, array $setData): int
    {
        if (isset($this->setIds[$setCode])) {
            return $this->setIds[$setCode];
        }

        $set = MtgSet::updateOrCreate(
            ['code' => $setCode],
            [
                'game_id' => $this->gameId,
                'name' => $setData['name'] ?? $setCode,
                'type' => $setData['type'] ?? null,
                'release_date' => isset($setData['releaseDate']) ? $setData['releaseDate'] : null,
                'base_set_size' => $setData['baseSetSize'] ?? null,
                'total_set_size' => $setData['totalSetSize'] ?? null,
                'is_foil_only' => $setData['isFoilOnly'] ?? false,
                'is_online_only' => $setData['isOnlineOnly'] ?? false,
                'keyrune_code' => $setData['keyruneCode'] ?? null,
                'mtgo_code' => $setData['mtgoCode'] ?? null,
                'tcgplayer_group_id' => $setData['tcgplayerGroupId'] ?? null,
                'mcm_id' => $setData['mcmId'] ?? null,
                'mcm_name' => $setData['mcmName'] ?? null,
                'languages' => $setData['languages'] ?? null,
                'translations' => $setData['translations'] ?? null,
            ]
        );

        $this->setIds[$setCode] = $set->id;

        return $set->id;
    }

    private function processChunkWithRetry(array $chunk, int $setId, $bar, int $attempts = 3): void
    {
        $lastException = null;

        for ($i = 0; $i < $attempts; $i++) {
            try {
                DB::transaction(function () use ($chunk, $setId, $bar) {
                    foreach ($chunk as $cardData) {
                        $this->processCard($cardData, $setId);
                        $bar->advance();
                    }
                });

                return; // Success, exit the retry loop
            } catch (\Illuminate\Database\DeadlockException $e) {
                $lastException = $e;
                usleep(100000 * ($i + 1)); // Wait 100ms, 200ms, 300ms before retry
            }
        }

        // If all retries failed, try one card at a time
        foreach ($chunk as $cardData) {
            try {
                DB::transaction(function () use ($cardData, $setId) {
                    $this->processCard($cardData, $setId);
                });
            } catch (\Exception $e) {
                // Log and skip problematic cards
                $this->warn('Skipped card: '.($cardData['name'] ?? 'unknown').' - '.$e->getMessage());
            }
            $bar->advance();
        }
    }

    private function processCard(array $cardData, int $setId): void
    {
        // Get oracle ID from identifiers
        $oracleId = $cardData['identifiers']['scryfallOracleId'] ?? null;

        // Skip cards without oracle ID (tokens, emblems, etc. sometimes don't have them)
        if (! $oracleId) {
            return;
        }

        // Create or update the oracle card
        $cardId = $this->getOrCreateCardId($oracleId, $cardData);

        // Create the printing
        $this->createOrUpdatePrinting($cardId, $setId, $cardData);
    }

    private function getOrCreateCardId(string $oracleId, array $cardData): int
    {
        if (isset($this->cardIds[$oracleId])) {
            return $this->cardIds[$oracleId];
        }

        $card = MtgCard::updateOrCreate(
            ['oracle_id' => $oracleId],
            [
                'game_id' => $this->gameId,
                'name' => $cardData['name'],
                'mana_cost' => $cardData['manaCost'] ?? null,
                'mana_value' => $cardData['manaValue'] ?? $cardData['convertedManaCost'] ?? null,
                'type_line' => $cardData['type'] ?? null,
                'oracle_text' => $cardData['text'] ?? null,
                'power' => $cardData['power'] ?? null,
                'toughness' => $cardData['toughness'] ?? null,
                'loyalty' => $cardData['loyalty'] ?? null,
                'defense' => $cardData['defense'] ?? null,
                'colors' => $cardData['colors'] ?? [],
                'color_identity' => $cardData['colorIdentity'] ?? [],
                'types' => $cardData['types'] ?? [],
                'subtypes' => $cardData['subtypes'] ?? [],
                'supertypes' => $cardData['supertypes'] ?? [],
                'keywords' => $cardData['keywords'] ?? [],
                'layout' => $cardData['layout'] ?? null,
                'legalities' => $cardData['legalities'] ?? null,
                'edhrec_rank' => $cardData['edhrecRank'] ?? null,
            ]
        );

        $this->cardIds[$oracleId] = $card->id;

        return $card->id;
    }

    private function createOrUpdatePrinting(int $cardId, int $setId, array $cardData): void
    {
        $identifiers = $cardData['identifiers'] ?? [];

        MtgPrinting::updateOrCreate(
            ['uuid' => $cardData['uuid']],
            [
                'mtg_card_id' => $cardId,
                'mtg_set_id' => $setId,
                'scryfall_id' => $identifiers['scryfallId'] ?? null,
                'multiverse_id' => isset($identifiers['multiverseId']) ? (int) $identifiers['multiverseId'] : null,
                'number' => $cardData['number'] ?? '',
                'rarity' => $cardData['rarity'] ?? 'common',
                'artist' => $cardData['artist'] ?? null,
                'flavor_text' => isset($cardData['flavorText']) ? substr($cardData['flavorText'], 0, 1000) : null,
                'watermark' => $cardData['watermark'] ?? null,
                'border_color' => $cardData['borderColor'] ?? null,
                'frame_version' => $cardData['frameVersion'] ?? null,
                'finishes' => $cardData['finishes'] ?? null,
                'has_foil' => $cardData['hasFoil'] ?? false,
                'has_non_foil' => $cardData['hasNonFoil'] ?? true,
                'is_promo' => $cardData['isPromo'] ?? false,
                'is_full_art' => $cardData['isFullArt'] ?? false,
                'is_textless' => $cardData['isTextless'] ?? false,
                'is_oversized' => $cardData['isOversized'] ?? false,
                'availability' => $cardData['availability'] ?? null,
                'tcgplayer_product_id' => isset($identifiers['tcgplayerProductId']) ? (int) $identifiers['tcgplayerProductId'] : null,
                'cardmarket_id' => isset($identifiers['mcmId']) ? (int) $identifiers['mcmId'] : null,
                'mtgo_id' => isset($identifiers['mtgoId']) ? (int) $identifiers['mtgoId'] : null,
                'arena_id' => isset($identifiers['mtgArenaId']) ? (int) $identifiers['mtgArenaId'] : null,
                'image_url' => $this->buildImageUrl($identifiers['scryfallId'] ?? null),
            ]
        );
    }

    private function buildImageUrl(?string $scryfallId): ?string
    {
        if (! $scryfallId) {
            return null;
        }

        $a = substr($scryfallId, 0, 1);
        $b = substr($scryfallId, 1, 1);

        return "https://cards.scryfall.io/normal/front/{$a}/{$b}/{$scryfallId}.jpg";
    }
}
