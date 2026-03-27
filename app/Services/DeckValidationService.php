<?php

namespace App\Services;

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckZone;
use App\Models\UnifiedCard;
use App\Models\UnifiedInventory;
use Illuminate\Support\Collection;

class DeckValidationService
{
    public function __construct(
        private PlaysetService $playsetService
    ) {}

    /**
     * Validate a deck and return all errors.
     *
     * @return array{valid: bool, errors: array<array{type: string, message: string, zone?: string, card?: string}>}
     */
    public function validateDeck(Deck $deck): array
    {
        $errors = [];

        // Check zone limits
        $zoneErrors = $this->checkZoneLimits($deck);
        $errors = array_merge($errors, $zoneErrors);

        // Check playset limits
        $playsetErrors = $this->checkAllPlaysetLimits($deck);
        $errors = array_merge($errors, $playsetErrors);

        // Check collection availability if enabled
        if ($deck->use_collection_only) {
            $collectionErrors = $this->checkCollectionAvailability($deck);
            $errors = array_merge($errors, $collectionErrors);
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Check if adding a card would exceed playset limit.
     */
    public function checkPlaysetLimit(Deck $deck, UnifiedCard $card, int $additionalQty = 0): bool
    {
        $format = $deck->gameFormat;
        $rules = $this->playsetService->getRulesForFormat($deck->user_id, $format->id);

        // Get card data for matching
        $cardData = [
            'rarity' => $card->printings()->first()?->rarity,
            'types' => $card->game_specific['types'] ?? [],
            'traits' => $card->game_specific['traits'] ?? [],
        ];

        // Get max allowed for this card
        $maxAllowed = $this->getMaxCopiesForCard($cardData, $rules);

        // Count current copies in deck across all zones
        $currentCount = $deck->cards()
            ->whereHas('printing', fn ($q) => $q->where('card_id', $card->id))
            ->sum('quantity');

        return ($currentCount + $additionalQty) <= $maxAllowed;
    }

    /**
     * Check all zone limits and return errors.
     *
     * @return array<array{type: string, message: string, zone: string}>
     */
    public function checkZoneLimits(Deck $deck): array
    {
        $errors = [];
        $format = $deck->gameFormat;

        // Get all zones for this format (only those that count towards deck)
        $zones = DeckZone::where('game_format_id', $format->id)
            ->countingTowardsDeck()
            ->orderBy('sort_order')
            ->get();

        foreach ($zones as $zone) {
            $cardCount = $deck->cards()
                ->where('deck_zone_id', $zone->id)
                ->sum('quantity');

            // Check minimum
            if ($zone->is_required && $cardCount < $zone->min_cards) {
                $errors[] = [
                    'type' => 'zone_minimum',
                    'message' => "{$zone->name} requires at least {$zone->min_cards} cards (has {$cardCount})",
                    'zone' => $zone->slug,
                ];
            }

            // Check maximum
            if ($zone->max_cards !== null && $cardCount > $zone->max_cards) {
                $errors[] = [
                    'type' => 'zone_maximum',
                    'message' => "{$zone->name} allows at most {$zone->max_cards} cards (has {$cardCount})",
                    'zone' => $zone->slug,
                ];
            }
        }

        return $errors;
    }

    /**
     * Check collection availability for all cards in deck.
     *
     * @return array<array{type: string, message: string, card: string, needed: int, owned: int}>
     */
    public function checkCollectionAvailability(Deck $deck): array
    {
        $errors = [];
        $userId = $deck->user_id;
        $game = $deck->getGame();

        if (! $game) {
            return $errors;
        }

        // Group deck cards by card name
        $deckCardsByName = $deck->cards()
            ->with('printing.card')
            ->get()
            ->groupBy(fn (DeckCard $dc) => $dc->printing->card->name);

        foreach ($deckCardsByName as $cardName => $deckCards) {
            $needed = $deckCards->sum('quantity');

            // Count owned in collection
            $card = $deckCards->first()->printing->card;
            $owned = UnifiedInventory::where('user_id', $userId)
                ->where('in_collection', true)
                ->whereHas('printing', fn ($q) => $q->where('card_id', $card->id))
                ->sum('quantity');

            if ($owned < $needed) {
                $errors[] = [
                    'type' => 'collection_shortage',
                    'message' => "Not enough copies of {$cardName} in collection (need {$needed}, have {$owned})",
                    'card' => $cardName,
                    'needed' => $needed,
                    'owned' => $owned,
                ];
            }
        }

        return $errors;
    }

    /**
     * Check all playset limits in deck.
     *
     * @return array<array{type: string, message: string, card: string, count: int, max: int}>
     */
    private function checkAllPlaysetLimits(Deck $deck): array
    {
        $errors = [];
        $format = $deck->gameFormat;
        $rules = $this->playsetService->getRulesForFormat($deck->user_id, $format->id);

        // Get zone IDs that count towards deck (exclude maybe zone etc.)
        $countingZoneIds = DeckZone::where('game_format_id', $format->id)
            ->countingTowardsDeck()
            ->pluck('id');

        // Group deck cards by card name across counting zones only
        $cardsByName = $deck->cards()
            ->whereIn('deck_zone_id', $countingZoneIds)
            ->with('printing.card')
            ->get()
            ->groupBy(fn (DeckCard $dc) => $dc->printing->card->name);

        foreach ($cardsByName as $cardName => $deckCards) {
            $totalCount = $deckCards->sum('quantity');
            $card = $deckCards->first()->printing->card;

            $cardData = [
                'rarity' => $deckCards->first()->printing->rarity,
                'types' => $card->game_specific['types'] ?? [],
                'traits' => $card->game_specific['traits'] ?? [],
            ];

            $maxAllowed = $this->getMaxCopiesForCard($cardData, $rules);

            if ($totalCount > $maxAllowed) {
                $errors[] = [
                    'type' => 'playset_exceeded',
                    'message' => "Too many copies of {$cardName} ({$totalCount}/{$maxAllowed})",
                    'card' => $cardName,
                    'count' => $totalCount,
                    'max' => $maxAllowed,
                ];
            }
        }

        return $errors;
    }

    /**
     * Get max copies allowed for a card based on rules.
     */
    private function getMaxCopiesForCard(array $cardData, Collection $rules): int
    {
        foreach ($rules as $rule) {
            if ($rule->matches($cardData)) {
                return $rule->max_copies;
            }
        }

        return PlaysetService::DEFAULT_MAX_COPIES;
    }
}
