<?php

namespace App\Services;

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckInventoryAssignment;
use App\Models\UnifiedInventory;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DeckInventoryService
{
    /**
     * Condition priority for matching (best to worst).
     */
    private const CONDITION_PRIORITY = ['NM', 'LP', 'MP', 'HP', 'DMG'];

    /**
     * Assign inventory items to a deck based on its cards.
     *
     * @return array{assigned: int, missing: array<string, int>}
     */
    public function assignInventoryToDeck(Deck $deck): array
    {
        // First clear any existing assignments for this deck
        $this->clearAssignments($deck);

        $deck->load(['cards.printing.card']);
        $userId = $deck->user_id;

        $assigned = 0;
        $missing = [];

        DB::transaction(function () use ($deck, $userId, &$assigned, &$missing) {
            foreach ($deck->cards as $deckCard) {
                $result = $this->assignInventoryForDeckCard($deckCard, $userId);
                $assigned += $result['assigned'];

                if ($result['missing'] > 0) {
                    $cardName = $deckCard->printing?->card?->name ?? 'Unknown';
                    $missing[$cardName] = ($missing[$cardName] ?? 0) + $result['missing'];
                }
            }
        });

        return [
            'assigned' => $assigned,
            'missing' => $missing,
        ];
    }

    /**
     * Assign inventory for a single deck card.
     *
     * @return array{assigned: int, missing: int}
     */
    private function assignInventoryForDeckCard(DeckCard $deckCard, int $userId): array
    {
        $printingId = $deckCard->printing_id;
        $neededQuantity = $deckCard->quantity;
        $assigned = 0;

        // Get available inventory items for this printing
        $inventoryItems = $this->getAvailableInventory($printingId, $userId, $deckCard->deck_id);

        foreach ($inventoryItems as $inventory) {
            if ($assigned >= $neededQuantity) {
                break;
            }

            // Calculate how much is available from this inventory item
            $availableFromItem = $inventory->available_quantity;
            if ($availableFromItem <= 0) {
                continue;
            }

            // Assign as much as needed/available
            $assignQuantity = min($availableFromItem, $neededQuantity - $assigned);

            DeckInventoryAssignment::create([
                'deck_id' => $deckCard->deck_id,
                'unified_inventory_id' => $inventory->id,
                'quantity' => $assignQuantity,
            ]);

            $assigned += $assignQuantity;
        }

        return [
            'assigned' => $assigned,
            'missing' => max(0, $neededQuantity - $assigned),
        ];
    }

    /**
     * Get available inventory items for a printing, sorted by condition.
     *
     * @return Collection<int, UnifiedInventory>
     */
    private function getAvailableInventory(int $printingId, int $userId, int $excludeDeckId): Collection
    {
        // Get all matching inventory items
        $items = UnifiedInventory::query()
            ->where('printing_id', $printingId)
            ->where('user_id', $userId)
            ->where('in_collection', true)
            ->with('deckAssignments')
            ->get();

        // Calculate available quantity for each item (excluding the current deck)
        $items = $items->map(function ($item) use ($excludeDeckId) {
            // Sum assignments excluding the current deck
            $assignedToOtherDecks = $item->deckAssignments
                ->where('deck_id', '!=', $excludeDeckId)
                ->sum('quantity');

            $item->available_quantity = max(0, $item->quantity - $assignedToOtherDecks);

            return $item;
        });

        // Filter items with available quantity
        $items = $items->filter(fn ($item) => $item->available_quantity > 0);

        // Sort by condition priority (NM first)
        return $items->sortBy(function ($item) {
            $index = array_search($item->condition, self::CONDITION_PRIORITY);

            return $index === false ? 999 : $index;
        })->values();
    }

    /**
     * Clear all inventory assignments for a deck.
     */
    public function clearAssignments(Deck $deck): int
    {
        return DeckInventoryAssignment::where('deck_id', $deck->id)->delete();
    }

    /**
     * Get deck inventory status summary.
     *
     * @return array{total_cards: int, assigned_cards: int, missing_cards: array<string, int>}
     */
    public function getDeckInventoryStatus(Deck $deck): array
    {
        $deck->load(['cards.printing.card', 'inventoryAssignments']);

        $totalCards = $deck->cards->sum('quantity');
        $assignedCards = $deck->inventoryAssignments->sum('quantity');

        // Calculate missing cards
        $missing = [];
        foreach ($deck->cards as $deckCard) {
            $cardName = $deckCard->printing?->card?->name ?? 'Unknown';
            $needed = $deckCard->quantity;

            // Get assigned quantity for this printing
            $assigned = $deck->inventoryAssignments
                ->filter(fn ($assignment) => $assignment->inventory?->printing_id === $deckCard->printing_id)
                ->sum('quantity');

            $diff = $needed - $assigned;
            if ($diff > 0) {
                $missing[$cardName] = ($missing[$cardName] ?? 0) + $diff;
            }
        }

        return [
            'total_cards' => $totalCards,
            'assigned_cards' => $assignedCards,
            'missing_cards' => $missing,
        ];
    }
}
