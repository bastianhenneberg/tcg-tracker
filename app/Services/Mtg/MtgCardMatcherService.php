<?php

namespace App\Services\Mtg;

use App\Models\UnifiedPrinting;
use Illuminate\Support\Collection;

class MtgCardMatcherService
{
    /**
     * Find a card printing that matches the recognition result.
     *
     * @param  array{card_name?: string|null, set_code?: string|null, collector_number?: string|null}  $recognitionResult
     * @return array{match: UnifiedPrinting|null, confidence: string, alternatives: Collection}
     */
    public function findMatch(array $recognitionResult): array
    {
        $collectorNumber = $recognitionResult['collector_number'] ?? null;
        $cardName = $recognitionResult['card_name'] ?? null;
        $setCode = $recognitionResult['set_code'] ?? null;

        // Strategy 1: Exact match by set code and collector number
        if ($setCode && $collectorNumber) {
            $exactMatch = $this->findBySetAndNumber($setCode, $collectorNumber);
            if ($exactMatch) {
                return [
                    'match' => $exactMatch,
                    'confidence' => 'high',
                    'alternatives' => collect(),
                ];
            }
        }

        // Strategy 2: Match by collector number only (if unique enough)
        if ($collectorNumber && strlen($collectorNumber) >= 3) {
            $numberMatch = $this->findByCollectorNumber($collectorNumber);
            if ($numberMatch) {
                return [
                    'match' => $numberMatch,
                    'confidence' => 'medium',
                    'alternatives' => collect(),
                ];
            }
        }

        // Strategy 3: Fuzzy search by card name
        if ($cardName) {
            $nameMatches = $this->findByName($cardName, $setCode);
            if ($nameMatches->isNotEmpty()) {
                return [
                    'match' => $nameMatches->first(),
                    'confidence' => $nameMatches->count() === 1 ? 'medium' : 'low',
                    'alternatives' => $nameMatches->skip(1)->take(5),
                ];
            }
        }

        // No match found
        return [
            'match' => null,
            'confidence' => 'none',
            'alternatives' => collect(),
        ];
    }

    /**
     * Search for printings by set code and collector number.
     */
    protected function findBySetAndNumber(string $setCode, string $collectorNumber): ?UnifiedPrinting
    {
        // Clean collector number (e.g., "123/271" -> "123")
        $number = preg_replace('/\/.*$/', '', $collectorNumber);

        return UnifiedPrinting::query()
            ->with(['card', 'set'])
            ->forGame('mtg')
            ->where(function ($q) use ($setCode) {
                $q->whereRaw('LOWER(set_code) = ?', [strtolower($setCode)])
                    ->orWhereHas('set', fn ($s) => $s->whereRaw('LOWER(code) = ?', [strtolower($setCode)]));
            })
            ->where('collector_number', $number)
            ->first();
    }

    /**
     * Search for printings by collector number only.
     */
    protected function findByCollectorNumber(string $collectorNumber): ?UnifiedPrinting
    {
        // Clean collector number
        $number = preg_replace('/\/.*$/', '', $collectorNumber);

        return UnifiedPrinting::query()
            ->with(['card', 'set'])
            ->forGame('mtg')
            ->where('collector_number', $number)
            ->first();
    }

    /**
     * Search for printings by card name (fuzzy match).
     */
    protected function findByName(string $cardName, ?string $setCode = null): Collection
    {
        $query = UnifiedPrinting::query()
            ->with(['card', 'set'])
            ->forGame('mtg')
            ->whereHas('card', function ($q) use ($cardName) {
                $q->where('name', $cardName)
                    ->orWhere('name', 'LIKE', "%{$cardName}%");
            });

        if ($setCode) {
            $query->where(function ($q) use ($setCode) {
                $q->whereRaw('LOWER(set_code) = ?', [strtolower($setCode)])
                    ->orWhereHas('set', fn ($s) => $s->whereRaw('LOWER(code) = ?', [strtolower($setCode)]));
            });
        }

        return $query->orderByRaw('CASE WHEN EXISTS (
            SELECT 1 FROM unified_cards WHERE unified_cards.id = unified_printings.card_id AND unified_cards.name = ?
        ) THEN 0 ELSE 1 END', [$cardName])
            ->limit(10)
            ->get();
    }

    /**
     * Search for cards with autocomplete.
     */
    public function search(string $query, int $limit = 20): Collection
    {
        if (strlen($query) < 2) {
            return collect();
        }

        $normalizedQuery = \App\Models\UnifiedCard::normalize($query);

        return UnifiedPrinting::query()
            ->with(['card', 'set'])
            ->forGame('mtg')
            ->where(function ($q) use ($query, $normalizedQuery) {
                $q->whereHas('card', fn ($c) => $c->where('name_normalized', 'LIKE', "{$normalizedQuery}%")
                    ->orWhere('name_normalized', 'LIKE', "%{$normalizedQuery}%"))
                    ->orWhere('collector_number', $query)
                    ->orWhere('collector_number', 'LIKE', "{$query}%")
                    ->orWhereHas('set', fn ($s) => $s->where('name', 'LIKE', "%{$query}%")
                        ->orWhere('code', 'LIKE', "%{$query}%"));
            })
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
                'set_code' => $p->set?->code ?? $p->set_code,
                'collector_number' => $p->collector_number,
                'rarity' => $p->rarity,
                'image_url' => $p->image_url,
                'foiling' => $p->finish,
                'foiling_label' => $p->finish_label,
            ]);
    }

    /**
     * Get a specific printing by ID with all relations loaded.
     */
    public function getPrinting(int $id): ?UnifiedPrinting
    {
        return UnifiedPrinting::query()
            ->with(['card', 'set'])
            ->forGame('mtg')
            ->find($id);
    }
}
