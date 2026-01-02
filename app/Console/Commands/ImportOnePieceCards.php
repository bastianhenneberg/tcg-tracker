<?php

namespace App\Console\Commands;

use App\Models\Op\OpCard;
use App\Models\Op\OpPrinting;
use App\Models\Op\OpSet;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ImportOnePieceCards extends Command
{
    protected $signature = 'tcg:import-onepiece
                            {--fresh : Clear existing One Piece data before import}';

    protected $description = 'Import One Piece cards from the OPTCG API (optcgapi.com)';

    private const API_BASE = 'https://www.optcgapi.com/api';

    /** @var array<string, int> */
    private array $setIds = [];

    /** @var array<string, int> */
    private array $cardIds = [];

    public function handle(): int
    {
        if ($this->option('fresh')) {
            $this->warn('Clearing existing One Piece data...');
            $this->clearExistingData();
        }

        $this->preloadExistingData();

        // Step 1: Import Sets
        $this->info('Fetching sets from OPTCG API...');
        $sets = $this->fetchFromApi('/allSets/');

        if ($sets === null) {
            $this->error('Failed to fetch sets from API');

            return self::FAILURE;
        }

        $this->info('Found '.count($sets).' sets');
        $this->importSets($sets);

        // Step 2: Import Set Cards
        $this->info('Fetching set cards from OPTCG API...');
        $setCards = $this->fetchFromApi('/allSetCards/');

        if ($setCards === null) {
            $this->error('Failed to fetch set cards from API');

            return self::FAILURE;
        }

        $this->info('Found '.count($setCards).' set cards');
        $this->importCards($setCards, 'Set Cards');

        // Step 3: Import Starter Deck Cards
        $this->info('Fetching starter deck cards from OPTCG API...');
        $stCards = $this->fetchFromApi('/allSTCards/');

        if ($stCards !== null) {
            $this->info('Found '.count($stCards).' starter deck cards');
            $this->importCards($stCards, 'Starter Deck Cards');
        }

        // Step 4: Import Promo Cards
        $this->info('Fetching promo cards from OPTCG API...');
        $promoCards = $this->fetchFromApi('/allPromoCards/');

        if ($promoCards !== null) {
            $this->info('Found '.count($promoCards).' promo cards');
            $this->importCards($promoCards, 'Promo Cards');
        }

        $this->newLine();
        $this->info('Import completed successfully!');
        $this->table(
            ['Entity', 'Count'],
            [
                ['Sets', OpSet::count()],
                ['Cards', OpCard::count()],
                ['Printings', OpPrinting::count()],
            ]
        );

        return self::SUCCESS;
    }

    private function fetchFromApi(string $endpoint): ?array
    {
        try {
            $response = Http::timeout(60)->get(self::API_BASE.$endpoint);

            if (! $response->successful()) {
                $this->error("API request failed: {$response->status()}");

                return null;
            }

            return $response->json();
        } catch (\Exception $e) {
            $this->error("API request error: {$e->getMessage()}");

            return null;
        }
    }

    private function clearExistingData(): void
    {
        OpPrinting::query()->delete();
        OpCard::query()->delete();
        OpSet::query()->delete();
    }

    private function preloadExistingData(): void
    {
        $this->info('Loading existing data into cache...');

        $this->setIds = OpSet::pluck('id', 'external_id')->toArray();
        $this->cardIds = OpCard::pluck('id', 'external_id')->toArray();

        $this->info(sprintf('Cached %d sets and %d cards', count($this->setIds), count($this->cardIds)));
    }

    private function importSets(array $sets): void
    {
        $bar = $this->output->createProgressBar(count($sets));
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% %elapsed:6s%');
        $bar->start();

        DB::transaction(function () use ($sets, $bar) {
            foreach ($sets as $setData) {
                $this->getOrCreateSetId($setData);
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
    }

    private function importCards(array $cards, string $label): void
    {
        $bar = $this->output->createProgressBar(count($cards));
        $bar->setFormat(" {$label}: %current%/%max% [%bar%] %percent:3s%% %elapsed:6s%");
        $bar->start();

        // Process in chunks to reduce transaction overhead
        $chunks = array_chunk($cards, 100);

        foreach ($chunks as $chunk) {
            DB::transaction(function () use ($chunk, $bar) {
                foreach ($chunk as $cardData) {
                    $this->processCard($cardData);
                    $bar->advance();
                }
            });
        }

        $bar->finish();
        $this->newLine();
    }

    private function getOrCreateSetId(array $setData): int
    {
        $externalId = $setData['set_id'] ?? $setData['id'] ?? '';

        if (isset($this->setIds[$externalId])) {
            return $this->setIds[$externalId];
        }

        $set = OpSet::updateOrCreate(
            ['external_id' => $externalId],
            [
                'name' => $setData['set_name'] ?? $setData['name'] ?? $externalId,
                'type' => $this->determineSetType($externalId),
                'released_at' => null,
            ]
        );

        $this->setIds[$externalId] = $set->id;

        return $set->id;
    }

    private function determineSetType(string $setId): string
    {
        if (str_starts_with($setId, 'OP')) {
            return 'Booster';
        }
        if (str_starts_with($setId, 'ST')) {
            return 'Starter Deck';
        }
        if (str_starts_with($setId, 'EB')) {
            return 'Extra Booster';
        }
        if (str_starts_with($setId, 'P-')) {
            return 'Promo';
        }

        return 'Other';
    }

    private function processCard(array $cardData): void
    {
        // Extract card base data - create unique card based on name + card_type + color
        $cardName = $cardData['card_name'] ?? '';
        $cardType = $this->normalizeCardType($cardData['card_type'] ?? '');
        $color = $this->normalizeColor($cardData['card_color'] ?? '');

        // Generate a unique external ID for the card (not the printing)
        $cardExternalId = $this->generateCardExternalId($cardData);

        // Get or create the card
        $cardId = $this->getOrCreateCardId($cardExternalId, $cardData);

        // Get or create the set from the card data
        $setExternalId = $cardData['set_id'] ?? '';
        if (! isset($this->setIds[$setExternalId])) {
            $this->getOrCreateSetId([
                'set_id' => $setExternalId,
                'set_name' => $cardData['set_name'] ?? $setExternalId,
            ]);
        }
        $setId = $this->setIds[$setExternalId] ?? null;

        if (! $setId) {
            return;
        }

        // Create the printing
        $this->createOrUpdatePrinting($cardId, $setId, $cardData);
    }

    private function generateCardExternalId(array $cardData): string
    {
        // Use card_set_id if available (e.g., "OP01-077")
        if (! empty($cardData['card_set_id'])) {
            return $cardData['card_set_id'];
        }

        // Fallback: generate from name
        $name = $cardData['card_name'] ?? 'unknown';

        return md5($name);
    }

    private function getOrCreateCardId(string $externalId, array $cardData): int
    {
        if (isset($this->cardIds[$externalId])) {
            return $this->cardIds[$externalId];
        }

        $cardType = $this->normalizeCardType($cardData['card_type'] ?? '');
        $colors = $this->parseColors($cardData['card_color'] ?? '');

        $card = OpCard::updateOrCreate(
            ['external_id' => $externalId],
            [
                'name' => $cardData['card_name'] ?? 'Unknown',
                'card_type' => $cardType,
                'color' => $colors['primary'],
                'color_secondary' => $colors['secondary'],
                'cost' => $this->parseNumeric($cardData['card_cost'] ?? null),
                'power' => $this->parseNumeric($cardData['card_power'] ?? null),
                'life' => $this->parseNumeric($cardData['life'] ?? null),
                'counter' => $this->parseNumeric($cardData['counter_amount'] ?? null),
                'attribute' => $this->normalizeAttribute($cardData['attribute'] ?? null),
                'types' => $this->parseTypes($cardData['sub_types'] ?? ''),
                'effect' => $cardData['card_text'] ?? null,
                'trigger' => $cardData['trigger_text'] ?? null,
            ]
        );

        $this->cardIds[$externalId] = $card->id;

        return $card->id;
    }

    private function createOrUpdatePrinting(int $cardId, int $setId, array $cardData): void
    {
        $printingExternalId = $cardData['card_set_id'] ?? '';
        if (empty($printingExternalId)) {
            return;
        }

        OpPrinting::updateOrCreate(
            ['external_id' => $printingExternalId],
            [
                'op_card_id' => $cardId,
                'op_set_id' => $setId,
                'collector_number' => $this->extractCollectorNumber($printingExternalId),
                'rarity' => $this->normalizeRarity($cardData['rarity'] ?? ''),
                'is_alternate_art' => $this->isAlternateArt($cardData),
                'language' => 'EN',
                'image_url' => $cardData['card_image'] ?? null,
            ]
        );
    }

    private function normalizeCardType(?string $type): string
    {
        if (! $type) {
            return 'Character';
        }

        $type = trim(strtolower($type));

        return match ($type) {
            'leader' => 'Leader',
            'character' => 'Character',
            'event' => 'Event',
            'stage' => 'Stage',
            default => 'Character',
        };
    }

    private function normalizeColor(?string $color): string
    {
        if (! $color) {
            return 'Red';
        }

        $color = trim(strtolower($color));

        return match (true) {
            str_contains($color, 'red') => 'Red',
            str_contains($color, 'green') => 'Green',
            str_contains($color, 'blue') => 'Blue',
            str_contains($color, 'purple') => 'Purple',
            str_contains($color, 'black') => 'Black',
            str_contains($color, 'yellow') => 'Yellow',
            default => 'Red',
        };
    }

    private function parseColors(string $colorString): array
    {
        $colors = ['primary' => 'Red', 'secondary' => null];

        if (empty($colorString)) {
            return $colors;
        }

        $colorString = strtolower($colorString);

        // Check for dual colors (e.g., "Red/Green" or "Red-Green")
        $parts = preg_split('/[\\/\\-]/', $colorString);

        if (count($parts) >= 1) {
            $colors['primary'] = $this->normalizeColor(trim($parts[0]));
        }

        if (count($parts) >= 2) {
            $colors['secondary'] = $this->normalizeColor(trim($parts[1]));
        }

        return $colors;
    }

    private function normalizeAttribute(?string $attribute): ?string
    {
        if (! $attribute) {
            return null;
        }

        $attribute = trim(strtolower($attribute));

        return match ($attribute) {
            'slash' => 'Slash',
            'strike' => 'Strike',
            'ranged' => 'Ranged',
            'special' => 'Special',
            'wisdom' => 'Wisdom',
            default => null,
        };
    }

    private function normalizeRarity(?string $rarity): ?string
    {
        if (! $rarity) {
            return null;
        }

        $rarity = trim(strtoupper($rarity));

        return match ($rarity) {
            'L', 'LEADER' => 'L',
            'C', 'COMMON' => 'C',
            'UC', 'UNCOMMON' => 'UC',
            'R', 'RARE' => 'R',
            'SR', 'SUPER RARE' => 'SR',
            'SEC', 'SECRET RARE' => 'SEC',
            'SP', 'SPECIAL' => 'SP',
            'P', 'PROMO' => 'P',
            default => $rarity,
        };
    }

    private function parseTypes(?string $types): array
    {
        if (! $types) {
            return [];
        }

        // Split by common separators and clean up
        $parts = preg_split('/[,\\/]/', $types);

        return array_filter(array_map('trim', $parts));
    }

    private function parseNumeric($value): ?int
    {
        if ($value === null || $value === '' || $value === '-') {
            return null;
        }

        // Remove any non-numeric characters except minus
        $cleaned = preg_replace('/[^0-9\\-]/', '', (string) $value);

        if ($cleaned === '' || $cleaned === '-') {
            return null;
        }

        return (int) $cleaned;
    }

    private function extractCollectorNumber(string $cardId): string
    {
        // Card IDs are like "OP01-001" - extract the number part
        if (preg_match('/-(\d+)/', $cardId, $matches)) {
            return $matches[1];
        }

        return $cardId;
    }

    private function isAlternateArt(array $cardData): bool
    {
        // Check various indicators for alternate art
        $cardId = $cardData['card_set_id'] ?? '';

        // Cards with _p suffix are often parallel/alternate art
        if (str_contains(strtolower($cardId), '_p')) {
            return true;
        }

        // Check rarity for special variants
        $rarity = strtoupper($cardData['rarity'] ?? '');
        if (in_array($rarity, ['SP', 'SEC'])) {
            return false; // These are special rarities, not necessarily alternate art
        }

        return false;
    }
}
