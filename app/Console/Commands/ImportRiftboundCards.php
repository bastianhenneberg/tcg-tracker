<?php

namespace App\Console\Commands;

use App\Models\Riftbound\RiftboundCard;
use App\Models\Riftbound\RiftboundPrinting;
use App\Models\Riftbound\RiftboundSet;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ImportRiftboundCards extends Command
{
    protected $signature = 'riftbound:import {--fresh : Delete existing cards before import}';

    protected $description = 'Import Riftbound TCG cards from community data source';

    private const DATA_URL = 'https://gist.githubusercontent.com/OwenMelbz/e04dadf641cc9b81cb882b4612343112/raw/riftbound.json';

    public function handle(): int
    {
        $this->info('Fetching Riftbound card data...');

        try {
            $response = Http::timeout(60)->get(self::DATA_URL);

            if (! $response->successful()) {
                $this->error('Failed to fetch card data: '.$response->status());

                return self::FAILURE;
            }

            $cards = $response->json();
        } catch (\Exception $e) {
            $this->error('Error fetching data: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info('Found '.count($cards).' cards to import.');

        if ($this->option('fresh')) {
            $this->warn('Deleting existing Riftbound cards...');
            RiftboundPrinting::query()->delete();
            RiftboundCard::query()->delete();
            RiftboundSet::query()->delete();
        }

        // Ensure sets exist
        $this->createSets();

        $bar = $this->output->createProgressBar(count($cards));
        $bar->start();

        $imported = 0;
        $skipped = 0;
        $errors = 0;

        DB::beginTransaction();

        try {
            foreach ($cards as $cardData) {
                try {
                    $result = $this->importCard($cardData);
                    if ($result === 'imported') {
                        $imported++;
                    } elseif ($result === 'skipped') {
                        $skipped++;
                    }
                } catch (\Exception $e) {
                    $errors++;
                    $this->newLine();
                    $this->error("Error importing {$cardData['name']}: ".$e->getMessage());
                }

                $bar->advance();
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Import failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("Import complete: {$imported} imported, {$skipped} skipped, {$errors} errors");

        return self::SUCCESS;
    }

    private function createSets(): void
    {
        $sets = [
            ['code' => 'OGN', 'name' => 'Origins', 'release_date' => '2024-01-01'],
            ['code' => 'OGS', 'name' => 'Proving Grounds', 'release_date' => '2024-06-01'],
            ['code' => 'SFD', 'name' => 'Spiritforged', 'release_date' => '2024-09-01'],
            ['code' => 'ARC', 'name' => 'Arcane Box Set', 'release_date' => '2024-03-01'],
        ];

        foreach ($sets as $setData) {
            RiftboundSet::firstOrCreate(
                ['code' => $setData['code']],
                $setData
            );
        }
    }

    private function importCard(array $data): string
    {
        $name = $data['name'] ?? null;
        if (! $name) {
            return 'skipped';
        }

        $externalId = $data['id'] ?? null;

        // Check if card already exists
        $existingCard = RiftboundCard::where('external_id', $externalId)->first();

        if ($existingCard) {
            // Check if this printing already exists
            $collectorNumber = $data['collectorNumber'] ?? $data['publicCode'] ?? null;
            $setCode = $data['set'] ?? 'OGN';
            $set = RiftboundSet::where('code', $setCode)->first();

            if ($set) {
                $existingPrinting = RiftboundPrinting::where('riftbound_card_id', $existingCard->id)
                    ->where('collector_number', $collectorNumber)
                    ->where('riftbound_set_id', $set->id)
                    ->first();

                if ($existingPrinting) {
                    return 'skipped';
                }
            }

            // Add new printing to existing card
            $this->createPrinting($existingCard, $data);

            return 'imported';
        }

        // Create new card
        $rawTypes = $data['cardType'] ?? [];
        $cardTypes = collect($rawTypes)->map(function ($type) {
            if (is_array($type) && isset($type['label'])) {
                return $type['label'];
            }
            return $type;
        })->toArray();
        $domains = collect($data['domains'] ?? [])->map(function ($domain) {
            if (is_array($domain) && isset($domain['label'])) {
                return $domain['label'];
            }
            return $domain;
        })->toArray();
        $illustrators = $data['illustrator'] ?? [];
        if (is_string($illustrators)) {
            $illustrators = [$illustrators];
        }

        $card = RiftboundCard::create([
            'external_id' => $externalId,
            'name' => $name,
            'types' => $cardTypes,
            'domains' => $domains,
            'energy' => $data['energy'] ?? null,
            'power' => $data['power'] ?? null,
            'functional_text' => $this->cleanText($data['text'] ?? null),
            'illustrators' => $illustrators,
        ]);

        $this->createPrinting($card, $data);

        return 'imported';
    }

    private function createPrinting(RiftboundCard $card, array $data): RiftboundPrinting
    {
        $collectorNumber = $data['collectorNumber'] ?? $data['publicCode'] ?? null;
        $setCode = $data['set'] ?? 'OGN';
        $set = RiftboundSet::where('code', $setCode)->first();

        if (! $set) {
            // Create set if it doesn't exist
            $set = RiftboundSet::create([
                'code' => $setCode,
                'name' => $this->getSetName($setCode),
                'release_date' => null,
            ]);
        }

        $rarity = $this->mapRarity($data['rarity'] ?? null);
        $foiling = $this->detectFoiling($data);
        $imageUrl = $data['cardImage']['url'] ?? null;

        return RiftboundPrinting::create([
            'riftbound_card_id' => $card->id,
            'riftbound_set_id' => $set->id,
            'collector_number' => $collectorNumber,
            'rarity' => $rarity,
            'foiling' => $foiling,
            'language' => 'EN',
            'image_url' => $imageUrl,
        ]);
    }

    private function getSetName(?string $setCode): string
    {
        return match ($setCode) {
            'OGN' => 'Origins',
            'OGS' => 'Proving Grounds',
            'SFD' => 'Spiritforged',
            'ARC' => 'Arcane Box Set',
            default => $setCode ?? 'Unknown',
        };
    }

    private function mapRarity(mixed $rarity): ?string
    {
        if (! $rarity) {
            return null;
        }

        // Handle array format (some cards have rarity as array with label)
        if (is_array($rarity)) {
            $rarity = $rarity['label'] ?? $rarity[0] ?? null;
            if (! $rarity) {
                return null;
            }
        }

        return match (strtolower((string) $rarity)) {
            'common' => 'C',
            'uncommon' => 'U',
            'rare' => 'R',
            'epic' => 'E',
            'showcase', 'overnumbered' => 'O',
            'promo' => 'P',
            default => (string) $rarity,
        };
    }

    private function detectFoiling(array $data): string
    {
        $rawRarity = $data['rarity'] ?? '';
        if (is_array($rawRarity)) {
            $rawRarity = $rawRarity['label'] ?? $rawRarity[0] ?? '';
        }
        $rarity = strtolower((string) $rawRarity);

        // Rares and Epics are always foil
        if (in_array($rarity, ['rare', 'epic'])) {
            return 'F';
        }

        // Showcase/Overnumbered cards have special foil
        if (in_array($rarity, ['showcase', 'overnumbered'])) {
            return 'O';
        }

        // Check for alternate art in the ID
        $id = $data['id'] ?? '';
        if (str_contains($id, '-a') || str_contains($id, '-alt')) {
            return 'A';
        }

        return 'N';
    }

    private function cleanText(?string $text): ?string
    {
        if (! $text) {
            return null;
        }

        // Remove HTML tags but keep the content
        $text = strip_tags($text);
        // Normalize whitespace
        $text = preg_replace('/\s+/', ' ', $text);

        return trim($text);
    }
}
