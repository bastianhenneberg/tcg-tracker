<?php

namespace App\Services;

use App\Models\Card;
use App\Models\CardPrinting;
use Illuminate\Support\Collection;

class CardMatcherService
{
    /**
     * Find a card printing that matches the recognition result.
     *
     * @param  array{game?: string|null, card_name?: string|null, set_code?: string|null, collector_number?: string|null, foiling?: string|null}  $recognitionResult
     * @return array{match: CardPrinting|null, confidence: string, alternatives: Collection}
     */
    public function findMatch(array $recognitionResult): array
    {
        $collectorNumber = $recognitionResult['collector_number'] ?? null;
        $cardName = $recognitionResult['card_name'] ?? null;
        $setCode = $recognitionResult['set_code'] ?? null;
        $foiling = $recognitionResult['foiling'] ?? null;

        // Strategy 1: Exact match by collector number
        if ($collectorNumber) {
            $exactMatch = $this->findByCollectorNumber($collectorNumber, $foiling);
            if ($exactMatch) {
                return [
                    'match' => $exactMatch,
                    'confidence' => 'high',
                    'alternatives' => collect(),
                ];
            }
        }

        // Strategy 2: Match by set code + partial collector number
        if ($setCode && $collectorNumber) {
            $setMatch = $this->findBySetAndNumber($setCode, $collectorNumber, $foiling);
            if ($setMatch) {
                return [
                    'match' => $setMatch,
                    'confidence' => 'high',
                    'alternatives' => collect(),
                ];
            }
        }

        // Strategy 3: Fuzzy search by card name
        if ($cardName) {
            $nameMatches = $this->findByName($cardName, $setCode, $foiling);
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
     * Search for printings by collector number (exact match).
     */
    protected function findByCollectorNumber(string $collectorNumber, ?string $foiling = null): ?CardPrinting
    {
        $query = CardPrinting::query()
            ->with(['card', 'cardSet'])
            ->where('collector_number', $collectorNumber);

        if ($foiling) {
            $query->where('foiling', $foiling);
        }

        return $query->first();
    }

    /**
     * Search for printings by set code and collector number.
     */
    protected function findBySetAndNumber(string $setCode, string $collectorNumber, ?string $foiling = null): ?CardPrinting
    {
        // Extract just the number part if the collector number includes set prefix
        $numberPart = preg_replace('/^[A-Z]+/', '', $collectorNumber);

        $query = CardPrinting::query()
            ->with(['card', 'cardSet'])
            ->whereHas('cardSet', function ($q) use ($setCode) {
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
        $query = CardPrinting::query()
            ->with(['card', 'cardSet'])
            ->whereHas('card', function ($q) use ($cardName) {
                // Exact match first
                $q->where('name', $cardName)
                    // Then try LIKE match
                    ->orWhere('name', 'LIKE', "%{$cardName}%");
            });

        if ($setCode) {
            $query->whereHas('cardSet', function ($q) use ($setCode) {
                $q->where('external_id', $setCode);
            });
        }

        if ($foiling) {
            $query->where('foiling', $foiling);
        }

        return $query->orderByRaw('CASE WHEN EXISTS (
            SELECT 1 FROM cards WHERE cards.id = card_printings.card_id AND cards.name = ?
        ) THEN 0 ELSE 1 END', [$cardName])
            ->limit(10)
            ->get();
    }

    /**
     * Search for cards with autocomplete.
     *
     * @return Collection<CardPrinting>
     */
    public function search(string $query, int $limit = 20): Collection
    {
        return CardPrinting::query()
            ->with(['card', 'cardSet'])
            ->where(function ($q) use ($query) {
                $q->whereHas('card', function ($cardQuery) use ($query) {
                    $cardQuery->where('name', 'LIKE', "%{$query}%");
                })
                ->orWhere('collector_number', 'LIKE', "%{$query}%");
            })
            ->orderByRaw('CASE
                WHEN collector_number = ? THEN 0
                WHEN collector_number LIKE ? THEN 1
                WHEN EXISTS (SELECT 1 FROM cards WHERE cards.id = card_printings.card_id AND cards.name = ?) THEN 2
                WHEN EXISTS (SELECT 1 FROM cards WHERE cards.id = card_printings.card_id AND cards.name LIKE ?) THEN 3
                ELSE 4
            END', [$query, "{$query}%", $query, "{$query}%"])
            ->limit($limit)
            ->get();
    }

    /**
     * Get a specific printing by ID with all relations loaded.
     */
    public function getPrinting(int $id): ?CardPrinting
    {
        return CardPrinting::query()
            ->with(['card', 'cardSet'])
            ->find($id);
    }
}
