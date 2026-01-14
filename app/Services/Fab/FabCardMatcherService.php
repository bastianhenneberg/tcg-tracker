<?php

namespace App\Services\Fab;

use App\Models\Custom\CustomPrinting;
use App\Models\Fab\FabPrinting;
use App\Models\UnifiedPrinting;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class FabCardMatcherService
{
    /**
     * Find a card printing that matches the recognition result.
     *
     * @param  array{card_name?: string|null, set_code?: string|null, collector_number?: string|null, foiling?: string|null}  $recognitionResult
     * @return array{match: UnifiedPrinting|CustomPrinting|null, confidence: string, alternatives: Collection, is_custom: bool}
     */
    public function findMatch(array $recognitionResult): array
    {
        $collectorNumber = $recognitionResult['collector_number'] ?? null;
        $cardName = $recognitionResult['card_name'] ?? null;
        $setCode = $recognitionResult['set_code'] ?? null;
        $foiling = $recognitionResult['foiling'] ?? null;

        // Parse card name to extract color and foiling if present
        // E.g., "Smelting of the Old Ones (Extended Art Rainbow Foil)" → foiling = "R-EA"
        if ($cardName) {
            $parsed = $this->parseCardName($cardName);
            $cardName = $parsed['name']; // Use base name for matching

            // Use parsed foiling if no explicit foiling was provided
            if (! $foiling && $parsed['foiling']) {
                $foiling = $parsed['foiling'];
            }
        }

        // Strategy 1: Exact match by collector number in main DB
        if ($collectorNumber) {
            $exactMatch = $this->findByCollectorNumber($collectorNumber, $foiling);
            if ($exactMatch) {
                return [
                    'match' => $exactMatch,
                    'confidence' => 'high',
                    'alternatives' => collect(),
                    'is_custom' => false,
                ];
            }
        }

        // Strategy 2: Match by set code + partial collector number in main DB
        if ($setCode && $collectorNumber) {
            $setMatch = $this->findBySetAndNumber($setCode, $collectorNumber, $foiling);
            if ($setMatch) {
                return [
                    'match' => $setMatch,
                    'confidence' => 'high',
                    'alternatives' => collect(),
                    'is_custom' => false,
                ];
            }
        }

        // Strategy 3: Fuzzy search by card name in main DB
        if ($cardName) {
            $nameMatches = $this->findByName($cardName, $setCode, $foiling);
            if ($nameMatches->isNotEmpty()) {
                return [
                    'match' => $nameMatches->first(),
                    'confidence' => $nameMatches->count() === 1 ? 'medium' : 'low',
                    'alternatives' => $nameMatches->skip(1)->take(5),
                    'is_custom' => false,
                ];
            }
        }

        // Strategy 4: Search in custom cards database
        $customMatch = $this->findCustomCard($cardName, $setCode, $collectorNumber, $foiling);
        if ($customMatch) {
            return [
                'match' => $customMatch,
                'confidence' => 'high',
                'alternatives' => collect(),
                'is_custom' => true,
            ];
        }

        // No match found
        return [
            'match' => null,
            'confidence' => 'none',
            'alternatives' => collect(),
            'is_custom' => false,
        ];
    }

    /**
     * Search for a custom card printing by name, set, or collector number.
     */
    protected function findCustomCard(?string $cardName, ?string $setCode, ?string $collectorNumber, ?string $foiling): ?CustomPrinting
    {
        $userId = Auth::id();
        if (! $userId) {
            return null;
        }

        $query = CustomPrinting::query()
            ->with(['card.linkedFabCard.printings'])
            ->where('user_id', $userId)
            ->whereHas('card', fn ($q) => $q->where('game_id', 1)); // FAB game ID

        // Try exact match by collector number and set first
        if ($collectorNumber && $setCode) {
            $exact = (clone $query)
                ->where('collector_number', $collectorNumber)
                ->where('set_name', $setCode)
                ->first();
            if ($exact) {
                return $exact;
            }
        }

        // Try by card name
        if ($cardName) {
            $byName = (clone $query)
                ->whereHas('card', fn ($q) => $q->where('name', $cardName))
                ->first();
            if ($byName) {
                return $byName;
            }

            // Fuzzy match by name
            $byNameFuzzy = (clone $query)
                ->whereHas('card', fn ($q) => $q->where('name', 'like', "%{$cardName}%"))
                ->first();
            if ($byNameFuzzy) {
                return $byNameFuzzy;
            }
        }

        return null;
    }

    /**
     * Search for printings by collector number (exact match).
     */
    protected function findByCollectorNumber(string $collectorNumber, ?string $foiling = null): ?UnifiedPrinting
    {
        $query = UnifiedPrinting::query()
            ->with(['card', 'set'])
            ->forGame('fab')
            ->where('collector_number', $collectorNumber);

        if ($foiling) {
            // Try exact finish match first
            $exactMatch = (clone $query)->where('finish', $foiling)->first();
            if ($exactMatch) {
                return $exactMatch;
            }

            // Fallback: if foiling is R/C/G, also try with art variations
            if (in_array($foiling, ['R', 'C', 'G'], true)) {
                $artVariationMatch = (clone $query)
                    ->where('finish', 'LIKE', $foiling.'-%')
                    ->first();
                if ($artVariationMatch) {
                    return $artVariationMatch;
                }
            }
        }

        return $query->first();
    }

    /**
     * Search for printings by set code and collector number.
     */
    protected function findBySetAndNumber(string $setCode, string $collectorNumber, ?string $foiling = null): ?UnifiedPrinting
    {
        // Extract just the number part if the collector number includes set prefix
        $numberPart = preg_replace('/^[A-Z]+/', '', $collectorNumber);

        $query = UnifiedPrinting::query()
            ->with(['card', 'set'])
            ->forGame('fab')
            ->where(function ($q) use ($setCode) {
                $q->where('set_code', $setCode)
                    ->orWhere('set_code', 'LIKE', "%{$setCode}%")
                    ->orWhereHas('set', function ($setQ) use ($setCode) {
                        $setQ->where('code', $setCode)
                            ->orWhere('code', 'LIKE', "%{$setCode}%");
                    });
            })
            ->where(function ($q) use ($collectorNumber, $numberPart, $setCode) {
                $q->where('collector_number', $collectorNumber)
                    ->orWhere('collector_number', $numberPart)
                    ->orWhere('collector_number', $setCode.$numberPart);
            });

        if ($foiling) {
            // Try exact finish match first
            $exactMatch = (clone $query)->where('finish', $foiling)->first();
            if ($exactMatch) {
                return $exactMatch;
            }

            // Fallback: if foiling is R/C/G, also try with art variations (R-EA, R-AA, R-FA, etc.)
            // This handles cases where TCG Powertools exports "Rainbow Foil" but the card is "Extended Art Rainbow Foil"
            if (in_array($foiling, ['R', 'C', 'G'], true)) {
                $artVariationMatch = (clone $query)
                    ->where('finish', 'LIKE', $foiling.'-%')
                    ->first();
                if ($artVariationMatch) {
                    return $artVariationMatch;
                }
            }
        }

        return $query->first();
    }

    /**
     * Parse FAB card name that may contain color and foiling info.
     * E.g., "Clash of Heads (Yellow) (Rainbow Foil)" → ['name' => 'Clash of Heads', 'pitch' => 2, 'foiling' => 'R']
     *
     * @return array{name: string, pitch: int|null, foiling: string|null}
     */
    protected function parseCardName(string $fullName): array
    {
        $name = $fullName;
        $pitch = null;
        $foiling = null;

        // Extract foiling from name (must be done first as it's at the end)
        $foilingPatterns = [
            '(Rainbow Foil)' => 'R',
            '(Cold Foil)' => 'C',
            '(Gold Cold Foil)' => 'G',
            '(Extended Art Rainbow Foil)' => 'R-EA',
            '(Extended Art Cold Foil)' => 'C-EA',
            '(Alternate Art Rainbow Foil)' => 'R-AA',
            '(Alternate Art Cold Foil)' => 'C-AA',
            '(Full Art Rainbow Foil)' => 'R-FA',
            '(Full Art Cold Foil)' => 'C-FA',
        ];

        foreach ($foilingPatterns as $pattern => $code) {
            if (str_contains($name, $pattern)) {
                $foiling = $code;
                $name = str_replace($pattern, '', $name);
                break;
            }
        }

        // Extract color/pitch from name
        $colorPatterns = [
            '(Red)' => 1,
            '(Yellow)' => 2,
            '(Blue)' => 3,
        ];

        foreach ($colorPatterns as $pattern => $pitchValue) {
            if (str_contains($name, $pattern)) {
                $pitch = $pitchValue;
                $name = str_replace($pattern, '', $name);
                break;
            }
        }

        return [
            'name' => trim($name),
            'pitch' => $pitch,
            'foiling' => $foiling,
        ];
    }

    /**
     * Search for printings by card name (fuzzy match).
     */
    protected function findByName(string $cardName, ?string $setCode = null, ?string $foiling = null): Collection
    {
        // Parse color and foiling from card name if present
        $parsed = $this->parseCardName($cardName);
        $baseName = $parsed['name'];
        $parsedPitch = $parsed['pitch'];
        $parsedFoiling = $parsed['foiling'];

        // Use parsed foiling if no explicit foiling was provided
        if (! $foiling && $parsedFoiling) {
            $foiling = $parsedFoiling;
        }

        $query = UnifiedPrinting::query()
            ->with(['card', 'set'])
            ->forGame('fab')
            ->whereHas('card', function ($q) use ($baseName, $parsedPitch) {
                $q->where(function ($nameQ) use ($baseName) {
                    $nameQ->where('name', $baseName)
                        ->orWhere('name', 'LIKE', "%{$baseName}%");
                });

                // If we parsed a pitch/color, filter by it
                if ($parsedPitch !== null) {
                    $q->whereRaw("JSON_EXTRACT(game_specific, '$.pitch') = ?", [$parsedPitch]);
                }
            });

        if ($setCode) {
            $query->where(function ($q) use ($setCode) {
                $q->where('set_code', $setCode)
                    ->orWhereHas('set', fn ($setQ) => $setQ->where('code', $setCode));
            });
        }

        if ($foiling) {
            $query->where('finish', $foiling);
        }

        return $query->orderByRaw('CASE WHEN EXISTS (
            SELECT 1 FROM unified_cards WHERE unified_cards.id = unified_printings.card_id AND unified_cards.name = ?
        ) THEN 0 ELSE 1 END', [$baseName])
            ->limit(10)
            ->get();
    }

    /**
     * Search for cards with autocomplete.
     * Returns both FAB printings and custom printings.
     */
    public function search(string $query, int $limit = 20): Collection
    {
        // Parse color and foiling from query if present
        $parsed = $this->parseCardName($query);
        $baseQuery = $parsed['name'];
        $parsedPitch = $parsed['pitch'];
        $parsedFoiling = $parsed['foiling'];

        $normalizedQuery = \App\Models\UnifiedCard::normalize($baseQuery);

        // Search in unified printings for FAB
        $fabResults = UnifiedPrinting::query()
            ->with(['card', 'set'])
            ->forGame('fab')
            ->where(function ($q) use ($query, $baseQuery, $normalizedQuery, $parsedPitch) {
                $q->whereHas('card', function ($cardQuery) use ($normalizedQuery, $parsedPitch) {
                    // Use name_normalized with index for better performance
                    $cardQuery->where(function ($nameQ) use ($normalizedQuery) {
                        $nameQ->where('name_normalized', 'LIKE', "{$normalizedQuery}%")
                            ->orWhere('name_normalized', 'LIKE', "%{$normalizedQuery}%");
                    });

                    // Filter by pitch if parsed from query
                    if ($parsedPitch !== null) {
                        $cardQuery->whereRaw("JSON_EXTRACT(game_specific, '$.pitch') = ?", [$parsedPitch]);
                    }
                })
                    ->orWhere('collector_number', $query)
                    ->orWhere('collector_number', $baseQuery)
                    ->orWhere('collector_number', 'LIKE', "{$baseQuery}%");
            })
            ->when($parsedFoiling, fn ($q) => $q->where('finish', $parsedFoiling))
            ->orderByRaw('CASE
                WHEN collector_number = ? THEN 0
                WHEN collector_number LIKE ? THEN 1
                WHEN EXISTS (SELECT 1 FROM unified_cards WHERE unified_cards.id = unified_printings.card_id AND unified_cards.name_normalized = ?) THEN 2
                WHEN EXISTS (SELECT 1 FROM unified_cards WHERE unified_cards.id = unified_printings.card_id AND unified_cards.name_normalized LIKE ?) THEN 3
                ELSE 4
            END', [$query, "{$query}%", $normalizedQuery, "{$normalizedQuery}%"])
            ->limit($limit)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'card_name' => $p->card->name,
                'set_name' => $p->set?->name ?? $p->set_name ?? $p->set_code,
                'collector_number' => $p->collector_number,
                'rarity' => $p->rarity,
                'rarity_label' => $p->rarity_label,
                'foiling' => $p->finish,
                'foiling_label' => $p->finish_label,
                'image_url' => $p->image_url,
                'is_custom' => false,
            ]);

        // Search in custom printings for current user
        $userId = Auth::id();
        $customResults = collect();

        if ($userId) {
            $customResults = CustomPrinting::query()
                ->with(['card.linkedFabCard.printings'])
                ->where('user_id', $userId)
                ->whereHas('card', fn ($q) => $q->where('game_id', 1)) // FAB
                ->where(function ($q) use ($query) {
                    $q->whereHas('card', fn ($c) => $c->where('name', 'LIKE', "%{$query}%"))
                        ->orWhere('collector_number', 'LIKE', "%{$query}%");
                })
                ->limit(10)
                ->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'card_name' => $p->card->name,
                    'set_name' => $p->set_name ?? 'Custom',
                    'collector_number' => ($p->set_name ?? '').($p->collector_number ?? '') ?: '-',
                    'rarity' => $p->rarity,
                    'rarity_label' => $p->rarity ? (FabPrinting::RARITIES[$p->rarity] ?? $p->rarity) : null,
                    'foiling' => $p->foiling,
                    'foiling_label' => $p->foiling ? (FabPrinting::FOILINGS[$p->foiling] ?? $p->foiling) : null,
                    // Image priority: custom > parent > null
                    'image_url' => $p->image_url ?? $p->card->linkedFabCard?->printings?->first()?->image_url,
                    'is_custom' => true,
                ]);
        }

        // Merge and return, custom cards first if exact match
        return collect($customResults->toArray())->concat($fabResults->toArray())->take($limit);
    }

    /**
     * Get a specific printing by ID with all relations loaded.
     */
    public function getPrinting(int $id): ?FabPrinting
    {
        return FabPrinting::query()
            ->with(['card', 'set'])
            ->find($id);
    }
}
