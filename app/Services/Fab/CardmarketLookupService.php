<?php

namespace App\Services\Fab;

use Illuminate\Support\Facades\Cache;

class CardmarketLookupService
{
    private const CSV_PATH = 'data/cardmarket/fab-products.csv';

    private const CACHE_KEY = 'cardmarket_fab_lookup';

    private const CACHE_TTL = 86400; // 24 hours

    /**
     * Lookup data indexed by collector_number + set_code.
     */
    private ?array $byCollectorNumber = null;

    /**
     * Lookup data indexed by normalized name.
     */
    private ?array $byName = null;

    /**
     * Find Cardmarket ID for a printing.
     *
     * @param  string  $collectorNumber  Our collector number (e.g., "MPG019")
     * @param  string  $setCode  Our set code (e.g., "MPG")
     * @param  string  $cardName  The card name
     * @param  string|null  $finish  Our finish code (S, R, C, G, R-EA, etc.)
     * @param  string|null  $color  Card color (Red, Yellow, Blue)
     */
    public function findCardmarketId(
        string $collectorNumber,
        string $setCode,
        string $cardName,
        ?string $finish = null,
        ?string $color = null
    ): ?int {
        $this->ensureLoaded();

        // Build name variations to try (exact match first, then fallbacks)
        $nameVariations = $this->buildCardmarketNameVariations($cardName, $finish, $color);

        // Strategy 1: Match by collector number + set code + name
        $numberOnly = preg_replace('/^[A-Z]+/', '', $collectorNumber);
        $key = strtoupper($setCode).'-'.$numberOnly;

        if (isset($this->byCollectorNumber[$key])) {
            // Try each name variation
            foreach ($nameVariations as $cardmarketName) {
                foreach ($this->byCollectorNumber[$key] as $entry) {
                    if ($this->namesMatch($entry['name'], $cardmarketName)) {
                        return $entry['id'];
                    }
                }
            }

            // Fallback: return first match for this collector number
            return $this->byCollectorNumber[$key][0]['id'];
        }

        // Strategy 2: Try with full collector number
        $keyFull = strtoupper($setCode).'-'.$collectorNumber;
        if (isset($this->byCollectorNumber[$keyFull])) {
            foreach ($nameVariations as $cardmarketName) {
                foreach ($this->byCollectorNumber[$keyFull] as $entry) {
                    if ($this->namesMatch($entry['name'], $cardmarketName)) {
                        return $entry['id'];
                    }
                }
            }

            return $this->byCollectorNumber[$keyFull][0]['id'];
        }

        // Strategy 3: Match by exact name
        foreach ($nameVariations as $cardmarketName) {
            $nameKey = $this->normalizeName($cardmarketName);
            if (isset($this->byName[$nameKey])) {
                return $this->byName[$nameKey];
            }
        }

        return null;
    }

    /**
     * Build card name variations in Cardmarket format (for fallback matching).
     *
     * @return array<string> Name variations to try (most specific first)
     */
    private function buildCardmarketNameVariations(string $cardName, ?string $finish, ?string $color): array
    {
        $baseName = $cardName;
        if ($color) {
            $baseName .= ' ('.$color.')';
        }

        $variations = [];

        // Get the exact foiling name first
        $exactFoiling = $this->mapFinishToCardmarket($finish);
        $variations[] = $baseName.' ('.$exactFoiling.')';

        // For art variants (EA, AA, FA), also try without the art type
        // E.g., "Extended Art Rainbow Foil" -> also try "Rainbow Foil"
        $baseFoiling = $this->getBaseFoiling($finish);
        if ($baseFoiling && $baseFoiling !== $exactFoiling) {
            $variations[] = $baseName.' ('.$baseFoiling.')';
        }

        // For Cold Foil variants, also try "Marvel" (Cardmarket's name for special cold foils)
        if ($finish && (str_starts_with($finish, 'C') || $finish === 'G')) {
            $variations[] = $baseName.' (Marvel)';
        }

        return array_unique($variations);
    }

    /**
     * Get base foiling without art type for fallback matching.
     */
    private function getBaseFoiling(?string $finish): ?string
    {
        return match ($finish) {
            'R-EA', 'R-AA', 'R-FA' => 'Rainbow Foil',
            'S-EA', 'S-AA', 'S-FA' => 'Regular',
            'C-EA', 'C-AA', 'C-FA' => 'Cold Foil',
            default => null,
        };
    }

    /**
     * Map our finish codes to Cardmarket foiling names.
     */
    private function mapFinishToCardmarket(?string $finish): string
    {
        return match ($finish) {
            'S', null => 'Regular',
            'R' => 'Rainbow Foil',
            'C' => 'Cold Foil',
            'G' => 'Cold Foil Golden',
            'R-EA' => 'Extended Art Rainbow Foil',
            'S-EA' => 'Extended Art Regular',
            'R-AA' => 'Alternate Art Rainbow Foil',
            'S-AA' => 'Alternate Art Regular',
            'R-FA' => 'Full Art Rainbow Foil',
            'S-FA' => 'Full Art Regular',
            'C-EA' => 'Extended Art Cold Foil',
            'C-AA' => 'Alternate Art Cold Foil',
            'C-FA' => 'Full Art Cold Foil',
            default => 'Regular',
        };
    }

    /**
     * Check if two names match (accounting for variations).
     */
    private function namesMatch(string $cardmarketName, string $ourName): bool
    {
        // Direct match
        if ($cardmarketName === $ourName) {
            return true;
        }

        // Normalize and compare
        $normalized1 = $this->normalizeName($cardmarketName);
        $normalized2 = $this->normalizeName($ourName);

        if ($normalized1 === $normalized2) {
            return true;
        }

        // Handle "Normal" vs "Regular" difference
        $cardmarketNormalized = str_replace('(normal)', '(regular)', strtolower($cardmarketName));
        $ourNormalized = strtolower($ourName);

        return $cardmarketNormalized === $ourNormalized;
    }

    /**
     * Normalize name for lookup.
     */
    private function normalizeName(string $name): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $name)));
    }

    /**
     * Ensure lookup data is loaded.
     */
    private function ensureLoaded(): void
    {
        if ($this->byCollectorNumber !== null) {
            return;
        }

        // Try cache first
        $cached = Cache::get(self::CACHE_KEY);
        if ($cached) {
            $this->byCollectorNumber = $cached['byCollectorNumber'];
            $this->byName = $cached['byName'];

            return;
        }

        // Load from CSV
        $this->loadFromCsv();

        // Cache the result
        Cache::put(self::CACHE_KEY, [
            'byCollectorNumber' => $this->byCollectorNumber,
            'byName' => $this->byName,
        ], self::CACHE_TTL);
    }

    /**
     * Load data from CSV file.
     */
    private function loadFromCsv(): void
    {
        $this->byCollectorNumber = [];
        $this->byName = [];

        $path = base_path(self::CSV_PATH);
        if (! file_exists($path)) {
            return;
        }

        $handle = fopen($path, 'r');
        if (! $handle) {
            return;
        }

        // Skip header row
        fgetcsv($handle);

        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) < 6) {
                continue;
            }

            $id = (int) $row[0];
            $name = $row[1];
            $collectorNumber = $row[2];
            $setCode = $row[5];

            // Index by set code + collector number
            $numberOnly = preg_replace('/^[A-Z]+[-]?/', '', $collectorNumber);
            $key = strtoupper($setCode).'-'.$numberOnly;

            if (! isset($this->byCollectorNumber[$key])) {
                $this->byCollectorNumber[$key] = [];
            }
            $this->byCollectorNumber[$key][] = [
                'id' => $id,
                'name' => $name,
            ];

            // Also index by full collector number (for cases like ARC125-R)
            $keyFull = strtoupper($setCode).'-'.$collectorNumber;
            if ($keyFull !== $key) {
                if (! isset($this->byCollectorNumber[$keyFull])) {
                    $this->byCollectorNumber[$keyFull] = [];
                }
                $this->byCollectorNumber[$keyFull][] = [
                    'id' => $id,
                    'name' => $name,
                ];
            }

            // Index by normalized name
            $nameKey = $this->normalizeName($name);
            $this->byName[$nameKey] = $id;
        }

        fclose($handle);
    }

    /**
     * Clear the cached lookup data.
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        $this->byCollectorNumber = null;
        $this->byName = null;
    }

    /**
     * Get statistics about the loaded data.
     */
    public function getStats(): array
    {
        $this->ensureLoaded();

        return [
            'entries_by_collector' => count($this->byCollectorNumber),
            'entries_by_name' => count($this->byName),
        ];
    }
}
