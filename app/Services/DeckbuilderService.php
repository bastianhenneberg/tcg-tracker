<?php

namespace App\Services;

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckZone;
use App\Models\UnifiedPrinting;
use Illuminate\Support\Facades\DB;

class DeckbuilderService
{
    public function __construct(
        private DeckValidationService $validationService
    ) {}

    /**
     * Add a card to a deck zone.
     */
    public function addCard(Deck $deck, UnifiedPrinting $printing, string $zoneSlug, int $qty = 1): DeckCard
    {
        $zone = DeckZone::where('game_format_id', $deck->game_format_id)
            ->where('slug', $zoneSlug)
            ->firstOrFail();

        // Check if card already exists in this zone
        $existing = DeckCard::where('deck_id', $deck->id)
            ->where('deck_zone_id', $zone->id)
            ->where('printing_id', $printing->id)
            ->first();

        if ($existing) {
            $existing->increment('quantity', $qty);

            return $existing->fresh();
        }

        // Get next position
        $maxPosition = DeckCard::where('deck_id', $deck->id)
            ->where('deck_zone_id', $zone->id)
            ->max('position') ?? -1;

        return DeckCard::create([
            'deck_id' => $deck->id,
            'deck_zone_id' => $zone->id,
            'printing_id' => $printing->id,
            'quantity' => $qty,
            'position' => $maxPosition + 1,
        ]);
    }

    /**
     * Remove a card from a deck.
     */
    public function removeCard(Deck $deck, int $deckCardId): void
    {
        DeckCard::where('id', $deckCardId)
            ->where('deck_id', $deck->id)
            ->delete();
    }

    /**
     * Move a card to a different zone.
     */
    public function moveCard(Deck $deck, int $deckCardId, string $targetZoneSlug): DeckCard
    {
        $targetZone = DeckZone::where('game_format_id', $deck->game_format_id)
            ->where('slug', $targetZoneSlug)
            ->firstOrFail();

        $deckCard = DeckCard::where('id', $deckCardId)
            ->where('deck_id', $deck->id)
            ->firstOrFail();

        // Check if same card already exists in target zone
        $existing = DeckCard::where('deck_id', $deck->id)
            ->where('deck_zone_id', $targetZone->id)
            ->where('printing_id', $deckCard->printing_id)
            ->first();

        if ($existing) {
            // Merge quantities
            $existing->increment('quantity', $deckCard->quantity);
            $deckCard->delete();

            return $existing->fresh();
        }

        // Get next position in target zone
        $maxPosition = DeckCard::where('deck_id', $deck->id)
            ->where('deck_zone_id', $targetZone->id)
            ->max('position') ?? -1;

        $deckCard->update([
            'deck_zone_id' => $targetZone->id,
            'position' => $maxPosition + 1,
        ]);

        return $deckCard->fresh();
    }

    /**
     * Update quantity of a card in deck.
     */
    public function updateQuantity(Deck $deck, int $deckCardId, int $qty): DeckCard
    {
        $deckCard = DeckCard::where('id', $deckCardId)
            ->where('deck_id', $deck->id)
            ->firstOrFail();

        if ($qty <= 0) {
            $deckCard->delete();

            return $deckCard;
        }

        $deckCard->update(['quantity' => $qty]);

        return $deckCard->fresh();
    }

    /**
     * Get deck statistics.
     *
     * @return array{total_cards: int, mana_curve: array, type_distribution: array, color_distribution: array, zones: array}
     */
    public function getStatistics(Deck $deck): array
    {
        $cards = $deck->cards()->with(['printing.card', 'zone'])->get();

        $manaCurve = [];
        $typeDistribution = [];
        $colorDistribution = [];
        $zoneStats = [];

        foreach ($cards as $deckCard) {
            $card = $deckCard->printing->card;
            $qty = $deckCard->quantity;

            // Mana curve (use cost from game_specific)
            $cost = $card->game_specific['cost'] ?? $card->game_specific['pitch'] ?? 0;
            $manaCurve[$cost] = ($manaCurve[$cost] ?? 0) + $qty;

            // Type distribution
            $types = $card->game_specific['types'] ?? [];
            foreach ($types as $type) {
                $typeDistribution[$type] = ($typeDistribution[$type] ?? 0) + $qty;
            }

            // Color distribution (if applicable)
            $colors = $card->game_specific['colors'] ?? $card->game_specific['color'] ?? [];
            if (is_string($colors)) {
                $colors = [$colors];
            }
            foreach ($colors as $color) {
                $colorDistribution[$color] = ($colorDistribution[$color] ?? 0) + $qty;
            }

            // Zone stats
            $zoneName = $deckCard->zone->name;
            $zoneStats[$zoneName] = ($zoneStats[$zoneName] ?? 0) + $qty;
        }

        // Sort mana curve by cost
        ksort($manaCurve);

        return [
            'total_cards' => $cards->sum('quantity'),
            'mana_curve' => $manaCurve,
            'type_distribution' => $typeDistribution,
            'color_distribution' => $colorDistribution,
            'zones' => $zoneStats,
        ];
    }

    /**
     * Export deck as text.
     */
    public function exportAsText(Deck $deck): string
    {
        $lines = [];
        $lines[] = "// {$deck->name}";
        $lines[] = "// Format: {$deck->gameFormat->name}";
        $lines[] = '';

        $zones = DeckZone::where('game_format_id', $deck->game_format_id)
            ->orderBy('sort_order')
            ->get();

        foreach ($zones as $zone) {
            $zoneCards = $deck->cards()
                ->where('deck_zone_id', $zone->id)
                ->with('printing.card')
                ->orderBy('position')
                ->get();

            if ($zoneCards->isEmpty()) {
                continue;
            }

            $lines[] = "// {$zone->name}";
            foreach ($zoneCards as $deckCard) {
                $cardName = $deckCard->printing->card->name;
                $lines[] = "{$deckCard->quantity}x {$cardName}";
            }
            $lines[] = '';
        }

        return implode("\n", $lines);
    }

    /**
     * Search cards for the deckbuilder.
     *
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function searchCards(Deck $deck, string $query, int $perPage = 20)
    {
        $game = $deck->getGame();

        if (! $game) {
            return collect()->paginate($perPage);
        }

        $printingsQuery = UnifiedPrinting::query()
            ->with('card')
            ->whereHas('card', function ($q) use ($game, $query) {
                $q->where('game', $game->slug);
                if (! empty($query)) {
                    $q->where(function ($q2) use ($query) {
                        $q2->where('name', 'like', "%{$query}%")
                            ->orWhere('name_normalized', 'like', "%{$query}%");
                    });
                }
            });

        // If collection only, filter to owned cards
        if ($deck->use_collection_only) {
            $printingsQuery->whereIn('id', function ($q) use ($deck) {
                $q->select('printing_id')
                    ->from('unified_inventories')
                    ->where('user_id', $deck->user_id)
                    ->where('in_collection', true)
                    ->where('quantity', '>', 0);
            });
        }

        return $printingsQuery
            ->orderBy(DB::raw('(SELECT name FROM unified_cards WHERE unified_cards.id = unified_printings.card_id)'))
            ->paginate($perPage);
    }

    /**
     * Get deck with all cards grouped by zone.
     */
    public function getDeckWithCards(Deck $deck): array
    {
        $zones = DeckZone::where('game_format_id', $deck->game_format_id)
            ->orderBy('sort_order')
            ->get();

        $deckCards = $deck->cards()
            ->with(['printing.card', 'zone'])
            ->orderBy('position')
            ->get()
            ->groupBy('deck_zone_id');

        $zonesWithCards = $zones->map(function ($zone) use ($deckCards) {
            $cards = $deckCards->get($zone->id, collect());

            return [
                'zone' => $zone,
                'cards' => $cards,
                'count' => $cards->sum('quantity'),
            ];
        });

        return [
            'deck' => $deck,
            'zones' => $zonesWithCards,
            'validation' => $this->validationService->validateDeck($deck),
            'statistics' => $this->getStatistics($deck),
        ];
    }
}
