<?php

namespace App\Services\Op;

use App\Contracts\CardMatcherInterface;
use App\Models\Custom\CustomPrinting;
use App\Models\Op\OpInventory;
use App\Models\Op\OpPrinting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class OpCardMatcherService implements CardMatcherInterface
{
    private const GAME_ID = 5; // One Piece game ID

    public function findMatch(array $recognitionResult): array
    {
        $collectorNumber = $recognitionResult['collector_number'] ?? null;
        $cardName = $recognitionResult['card_name'] ?? null;
        $setCode = $recognitionResult['set_code'] ?? null;

        // Strategy 1: Exact match by collector number
        if ($collectorNumber) {
            $exactMatch = $this->findByCollectorNumber($collectorNumber);
            if ($exactMatch) {
                return [
                    'match' => $exactMatch,
                    'confidence' => 'high',
                    'alternatives' => collect(),
                    'is_custom' => false,
                ];
            }
        }

        // Strategy 2: Match by set code + collector number
        if ($setCode && $collectorNumber) {
            $setMatch = $this->findBySetAndNumber($setCode, $collectorNumber);
            if ($setMatch) {
                return [
                    'match' => $setMatch,
                    'confidence' => 'high',
                    'alternatives' => collect(),
                    'is_custom' => false,
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
                    'is_custom' => false,
                ];
            }
        }

        // Strategy 4: Search in custom cards database
        $customMatch = $this->findCustomCard($cardName, $setCode, $collectorNumber);
        if ($customMatch) {
            return [
                'match' => $customMatch,
                'confidence' => 'high',
                'alternatives' => collect(),
                'is_custom' => true,
            ];
        }

        return [
            'match' => null,
            'confidence' => 'none',
            'alternatives' => collect(),
            'is_custom' => false,
        ];
    }

    protected function findCustomCard(?string $cardName, ?string $setCode, ?string $collectorNumber): ?CustomPrinting
    {
        $userId = Auth::id();
        if (! $userId) {
            return null;
        }

        $query = CustomPrinting::query()
            ->with(['card'])
            ->where('user_id', $userId)
            ->whereHas('card', fn ($q) => $q->where('game_id', self::GAME_ID));

        if ($collectorNumber && $setCode) {
            $exact = (clone $query)
                ->where('collector_number', $collectorNumber)
                ->where('set_name', $setCode)
                ->first();
            if ($exact) {
                return $exact;
            }
        }

        if ($cardName) {
            $byName = (clone $query)
                ->whereHas('card', fn ($q) => $q->where('name', $cardName))
                ->first();
            if ($byName) {
                return $byName;
            }

            $byNameFuzzy = (clone $query)
                ->whereHas('card', fn ($q) => $q->where('name', 'like', "%{$cardName}%"))
                ->first();
            if ($byNameFuzzy) {
                return $byNameFuzzy;
            }
        }

        return null;
    }

    protected function findByCollectorNumber(string $collectorNumber): ?OpPrinting
    {
        return OpPrinting::query()
            ->with(['card', 'set'])
            ->where('collector_number', $collectorNumber)
            ->first();
    }

    protected function findBySetAndNumber(string $setCode, string $collectorNumber): ?OpPrinting
    {
        $numberPart = preg_replace('/^[A-Z0-9]+-/', '', $collectorNumber);

        return OpPrinting::query()
            ->with(['card', 'set'])
            ->whereHas('set', function ($q) use ($setCode) {
                $q->where('external_id', $setCode)
                    ->orWhere('external_id', 'LIKE', "%{$setCode}%")
                    ->orWhere('name', 'LIKE', "%{$setCode}%");
            })
            ->where(function ($q) use ($collectorNumber, $numberPart) {
                $q->where('collector_number', $collectorNumber)
                    ->orWhere('collector_number', $numberPart);
            })
            ->first();
    }

    protected function findByName(string $cardName, ?string $setCode = null): Collection
    {
        $query = OpPrinting::query()
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

        return $query->limit(10)->get();
    }

    public function search(string $query, int $limit = 20): Collection
    {
        $opResults = OpPrinting::query()
            ->with(['card', 'set'])
            ->where(function ($q) use ($query) {
                $q->whereHas('card', function ($cardQuery) use ($query) {
                    $cardQuery->where('name', 'LIKE', "%{$query}%");
                })
                    ->orWhere('collector_number', 'LIKE', "%{$query}%");
            })
            ->limit($limit)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'card_name' => $p->card->name,
                'set_name' => $p->set->name ?? $p->set->external_id ?? 'Unknown',
                'collector_number' => $p->collector_number,
                'rarity' => $p->rarity,
                'rarity_label' => $p->rarity_label,
                'foiling' => null,
                'foiling_label' => null,
                'image_url' => $p->image_url,
                'is_custom' => false,
                'color' => $p->card->color ?? null,
            ]);

        $userId = Auth::id();
        $customResults = collect();

        if ($userId) {
            $customResults = CustomPrinting::query()
                ->with(['card'])
                ->where('user_id', $userId)
                ->whereHas('card', fn ($q) => $q->where('game_id', self::GAME_ID))
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
                    'collector_number' => $p->collector_number ?? '-',
                    'rarity' => $p->rarity,
                    'rarity_label' => $p->rarity,
                    'foiling' => null,
                    'foiling_label' => null,
                    'image_url' => $p->image_url,
                    'is_custom' => true,
                ]);
        }

        return collect($customResults->toArray())->concat($opResults->toArray())->take($limit);
    }

    public function getGameSlug(): string
    {
        return 'onepiece';
    }

    public function createInventoryItem(
        int $lotId,
        int $printingId,
        string $condition,
        ?string $foiling = null,
        ?string $language = null,
        bool $isCustom = false
    ): Model {
        $position = OpInventory::where('lot_id', $lotId)->max('position_in_lot') ?? 0;

        return OpInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $lotId,
            'op_printing_id' => $printingId,
            'condition' => $condition,
            'language' => $language ?? 'EN',
            'position_in_lot' => $position + 1,
        ]);
    }
}
