<?php

namespace App\Services\Mtg;

use App\Models\Mtg\MtgPrinting;
use Illuminate\Support\Collection;

class MtgCardMatcherService
{
    /**
     * Find a card printing that matches the recognition result.
     *
     * @param  array{card_name?: string|null, set_code?: string|null, collector_number?: string|null}  $recognitionResult
     * @return array{match: MtgPrinting|null, confidence: string, alternatives: Collection}
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
    protected function findBySetAndNumber(string $setCode, string $collectorNumber): ?MtgPrinting
    {
        // Clean collector number (e.g., "123/271" -> "123")
        $number = preg_replace('/\/.*$/', '', $collectorNumber);

        return MtgPrinting::query()
            ->with(['card', 'set'])
            ->whereHas('set', fn ($q) => $q->whereRaw('LOWER(code) = ?', [strtolower($setCode)]))
            ->where('number', $number)
            ->first();
    }

    /**
     * Search for printings by collector number only.
     */
    protected function findByCollectorNumber(string $collectorNumber): ?MtgPrinting
    {
        // Clean collector number
        $number = preg_replace('/\/.*$/', '', $collectorNumber);

        return MtgPrinting::query()
            ->with(['card', 'set'])
            ->where('number', $number)
            ->first();
    }

    /**
     * Search for printings by card name (fuzzy match).
     */
    protected function findByName(string $cardName, ?string $setCode = null): Collection
    {
        $query = MtgPrinting::query()
            ->with(['card', 'set'])
            ->whereHas('card', function ($q) use ($cardName) {
                $q->where('name', $cardName)
                    ->orWhere('name', 'LIKE', "%{$cardName}%");
            });

        if ($setCode) {
            $query->whereHas('set', fn ($q) => $q->whereRaw('LOWER(code) = ?', [strtolower($setCode)]));
        }

        return $query->orderByRaw('CASE WHEN EXISTS (
            SELECT 1 FROM mtg_cards WHERE mtg_cards.id = mtg_printings.mtg_card_id AND mtg_cards.name = ?
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

        return MtgPrinting::query()
            ->with(['card', 'set'])
            ->where(function ($q) use ($query) {
                $q->whereHas('card', fn ($c) => $c->where('name', 'LIKE', "%{$query}%"))
                    ->orWhere('number', 'LIKE', "%{$query}%")
                    ->orWhereHas('set', fn ($s) => $s->where('name', 'LIKE', "%{$query}%")
                        ->orWhere('code', 'LIKE', "%{$query}%"));
            })
            ->orderByRaw('CASE
                WHEN number = ? THEN 0
                WHEN number LIKE ? THEN 1
                WHEN EXISTS (SELECT 1 FROM mtg_cards WHERE mtg_cards.id = mtg_printings.mtg_card_id AND mtg_cards.name = ?) THEN 2
                WHEN EXISTS (SELECT 1 FROM mtg_cards WHERE mtg_cards.id = mtg_printings.mtg_card_id AND mtg_cards.name LIKE ?) THEN 3
                ELSE 4
            END', [$query, "{$query}%", $query, "{$query}%"])
            ->limit($limit)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'card_name' => $p->card->name,
                'set_name' => $p->set->name,
                'set_code' => $p->set->code,
                'number' => $p->number,
                'rarity' => $p->rarity,
                'image_url' => $p->image_url,
                'has_foil' => $p->has_foil,
                'has_non_foil' => $p->has_non_foil,
            ]);
    }

    /**
     * Get a specific printing by ID with all relations loaded.
     */
    public function getPrinting(int $id): ?MtgPrinting
    {
        return MtgPrinting::query()
            ->with(['card', 'set'])
            ->find($id);
    }
}
