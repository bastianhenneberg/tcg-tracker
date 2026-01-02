<?php

namespace App\Services\Fab;

use App\Models\Custom\CustomPrinting;
use App\Models\Fab\FabPrinting;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class FabCardMatcherService
{
    /**
     * Find a card printing that matches the recognition result.
     *
     * @param  array{card_name?: string|null, set_code?: string|null, collector_number?: string|null, foiling?: string|null}  $recognitionResult
     * @return array{match: FabPrinting|CustomPrinting|null, confidence: string, alternatives: Collection, is_custom: bool}
     */
    public function findMatch(array $recognitionResult): array
    {
        $collectorNumber = $recognitionResult['collector_number'] ?? null;
        $cardName = $recognitionResult['card_name'] ?? null;
        $setCode = $recognitionResult['set_code'] ?? null;
        $foiling = $recognitionResult['foiling'] ?? null;

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
    protected function findByCollectorNumber(string $collectorNumber, ?string $foiling = null): ?FabPrinting
    {
        $query = FabPrinting::query()
            ->with(['card', 'set'])
            ->where('collector_number', $collectorNumber);

        if ($foiling) {
            $query->where('foiling', $foiling);
        }

        return $query->first();
    }

    /**
     * Search for printings by set code and collector number.
     */
    protected function findBySetAndNumber(string $setCode, string $collectorNumber, ?string $foiling = null): ?FabPrinting
    {
        // Extract just the number part if the collector number includes set prefix
        $numberPart = preg_replace('/^[A-Z]+/', '', $collectorNumber);

        $query = FabPrinting::query()
            ->with(['card', 'set'])
            ->whereHas('set', function ($q) use ($setCode) {
                $q->where('external_id', $setCode)
                    ->orWhere('external_id', 'LIKE', "%{$setCode}%");
            })
            ->where(function ($q) use ($collectorNumber, $numberPart, $setCode) {
                $q->where('collector_number', $collectorNumber)
                    ->orWhere('collector_number', $numberPart)
                    ->orWhere('collector_number', $setCode.$numberPart);
            });

        if ($foiling) {
            $query->where('foiling', $foiling);
        }

        return $query->first();
    }

    /**
     * Search for printings by card name (fuzzy match).
     */
    protected function findByName(string $cardName, ?string $setCode = null, ?string $foiling = null): Collection
    {
        $query = FabPrinting::query()
            ->with(['card', 'set'])
            ->whereHas('card', function ($q) use ($cardName) {
                $q->where('name', $cardName)
                    ->orWhere('name', 'LIKE', "%{$cardName}%");
            });

        if ($setCode) {
            $query->whereHas('set', function ($q) use ($setCode) {
                $q->where('external_id', $setCode);
            });
        }

        if ($foiling) {
            $query->where('foiling', $foiling);
        }

        return $query->orderByRaw('CASE WHEN EXISTS (
            SELECT 1 FROM fab_cards WHERE fab_cards.id = fab_printings.fab_card_id AND fab_cards.name = ?
        ) THEN 0 ELSE 1 END', [$cardName])
            ->limit(10)
            ->get();
    }

    /**
     * Search for cards with autocomplete.
     * Returns both FAB printings and custom printings.
     */
    public function search(string $query, int $limit = 20): Collection
    {
        // Search in FAB printings
        $fabResults = FabPrinting::query()
            ->with(['card', 'set'])
            ->where(function ($q) use ($query) {
                $q->whereHas('card', function ($cardQuery) use ($query) {
                    $cardQuery->where('name', 'LIKE', "%{$query}%");
                })
                    ->orWhere('collector_number', 'LIKE', "%{$query}%");
            })
            ->orderByRaw('CASE
                WHEN collector_number = ? THEN 0
                WHEN collector_number LIKE ? THEN 1
                WHEN EXISTS (SELECT 1 FROM fab_cards WHERE fab_cards.id = fab_printings.fab_card_id AND fab_cards.name = ?) THEN 2
                WHEN EXISTS (SELECT 1 FROM fab_cards WHERE fab_cards.id = fab_printings.fab_card_id AND fab_cards.name LIKE ?) THEN 3
                ELSE 4
            END', [$query, "{$query}%", $query, "{$query}%"])
            ->limit($limit)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'card_name' => $p->card->name,
                'set_name' => $p->set->name ?? $p->set->external_id,
                'collector_number' => $p->collector_number,
                'rarity' => $p->rarity,
                'rarity_label' => $p->rarity_label,
                'foiling' => $p->foiling,
                'foiling_label' => $p->foiling_label,
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
