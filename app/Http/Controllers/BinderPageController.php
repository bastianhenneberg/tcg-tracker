<?php

namespace App\Http\Controllers;

use App\Models\Binder;
use App\Models\BinderPage;
use App\Models\UnifiedInventory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BinderPageController extends Controller
{
    public function show(BinderPage $binderPage): Response
    {
        $this->authorize('view', $binderPage);

        $binderPage->load([
            'binder',
            'inventoryItems.printing.card',
            'inventoryItems.printing.set',
            'inventoryItems.deckAssignments.deck',
        ]);

        $slots = [];
        $itemsBySlot = $binderPage->inventoryItems
            ->sortBy('position_in_slot')
            ->groupBy('binder_slot');

        for ($i = 1; $i <= BinderPage::SLOTS_PER_PAGE; $i++) {
            // Each slot can hold up to 4 cards
            // Add deck assignment info to each card
            $slotItems = $itemsBySlot->get($i, collect())
                ->take(4)
                ->values()
                ->map(function ($item) {
                    $item->deck_names = $item->deckAssignments
                        ->map(fn ($a) => $a->deck?->name)
                        ->filter()
                        ->unique()
                        ->values()
                        ->all();
                    $item->is_in_deck = count($item->deck_names) > 0;

                    return $item;
                })
                ->all();
            $slots[$i] = $slotItems;
        }

        return Inertia::render('collection/binders/pages/show', [
            'binderPage' => $binderPage,
            'binder' => $binderPage->binder,
            'slots' => $slots,
        ]);
    }

    public function update(Request $request, BinderPage $binderPage): RedirectResponse
    {
        $this->authorize('update', $binderPage);

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $binderPage->update($validated);

        return back();
    }

    public function destroy(BinderPage $binderPage): RedirectResponse
    {
        $this->authorize('delete', $binderPage);

        $binderId = $binderPage->binder_id;

        // Remove all cards from this page (set their binder fields to null)
        UnifiedInventory::where('binder_page_id', $binderPage->id)
            ->update([
                'binder_page_id' => null,
                'binder_slot' => null,
            ]);

        $binderPage->delete();

        return redirect()->route('binders.show', $binderId);
    }

    /**
     * Assign a card to a specific slot on the page.
     * Each slot can hold up to 4 cards.
     * If the source item has quantity > 1, split off one copy.
     */
    public function assignCard(Request $request, BinderPage $binderPage): RedirectResponse
    {
        $this->authorize('update', $binderPage);

        $validated = $request->validate([
            'inventory_id' => ['required', 'exists:unified_inventories,id'],
            'slot' => ['required', 'integer', 'min:1', 'max:'.BinderPage::SLOTS_PER_PAGE],
        ]);

        $inventory = UnifiedInventory::where('id', $validated['inventory_id'])
            ->where('user_id', Auth::id())
            ->where('in_collection', true)
            ->firstOrFail();

        // Check if slot already has 4 cards (maximum)
        $existingCount = UnifiedInventory::where('binder_page_id', $binderPage->id)
            ->where('binder_slot', $validated['slot'])
            ->count();

        if ($existingCount >= 4) {
            return back()->withErrors(['slot' => 'Dieser Slot ist voll (max. 4 Karten).']);
        }

        // If quantity > 1, split off one copy for the binder
        if ($inventory->quantity > 1) {
            $inventory->decrement('quantity');

            // Create new item for the binder slot
            UnifiedInventory::create([
                'user_id' => Auth::id(),
                'printing_id' => $inventory->printing_id,
                'condition' => $inventory->condition,
                'language' => $inventory->language,
                'quantity' => 1,
                'in_collection' => true,
                'binder_id' => $binderPage->binder_id,
                'binder_page_id' => $binderPage->id,
                'binder_slot' => $validated['slot'],
            ]);
        } else {
            // quantity = 1, move the entire item
            $inventory->update([
                'binder_id' => $binderPage->binder_id,
                'binder_page_id' => $binderPage->id,
                'binder_slot' => $validated['slot'],
            ]);
        }

        return back();
    }

    /**
     * Remove a specific card from a slot.
     */
    public function removeCard(Request $request, BinderPage $binderPage): RedirectResponse
    {
        $this->authorize('update', $binderPage);

        $validated = $request->validate([
            'inventory_id' => ['required', 'exists:unified_inventories,id'],
        ]);

        UnifiedInventory::where('id', $validated['inventory_id'])
            ->where('binder_page_id', $binderPage->id)
            ->where('user_id', Auth::id())
            ->update([
                'binder_id' => null,
                'binder_page_id' => null,
                'binder_slot' => null,
            ]);

        return back();
    }

    /**
     * Move a card from one slot to another within the same page.
     */
    public function moveCard(Request $request, BinderPage $binderPage): RedirectResponse
    {
        $this->authorize('update', $binderPage);

        $validated = $request->validate([
            'from_slot' => ['required', 'integer', 'min:1', 'max:'.BinderPage::SLOTS_PER_PAGE],
            'to_slot' => ['required', 'integer', 'min:1', 'max:'.BinderPage::SLOTS_PER_PAGE, 'different:from_slot'],
        ]);

        $fromItem = UnifiedInventory::where('binder_page_id', $binderPage->id)
            ->where('binder_slot', $validated['from_slot'])
            ->first();

        $toItem = UnifiedInventory::where('binder_page_id', $binderPage->id)
            ->where('binder_slot', $validated['to_slot'])
            ->first();

        if ($fromItem) {
            // Swap slots if both have items
            if ($toItem) {
                $toItem->update(['binder_slot' => $validated['from_slot']]);
            }
            $fromItem->update(['binder_slot' => $validated['to_slot']]);
        }

        return back();
    }

    /**
     * Move a specific card to a different slot (used by drag & drop).
     */
    public function moveCardToSlot(Request $request, BinderPage $binderPage): RedirectResponse
    {
        $this->authorize('update', $binderPage);

        $validated = $request->validate([
            'inventory_id' => ['required', 'exists:unified_inventories,id'],
            'to_slot' => ['required', 'integer', 'min:1', 'max:'.BinderPage::SLOTS_PER_PAGE],
            'position' => ['sometimes', 'integer', 'min:0', 'max:3'],
        ]);

        $inventory = UnifiedInventory::where('id', $validated['inventory_id'])
            ->where('binder_page_id', $binderPage->id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        // Check if target slot has room (max 4 cards)
        $toSlotCount = UnifiedInventory::where('binder_page_id', $binderPage->id)
            ->where('binder_slot', $validated['to_slot'])
            ->where('id', '!=', $inventory->id) // Exclude the card being moved
            ->count();

        if ($toSlotCount >= 4) {
            return back()->withErrors(['slot' => 'Dieser Slot ist voll (max. 4 Karten).']);
        }

        // Determine position in the new slot
        $position = $validated['position'] ?? $toSlotCount;

        // If moving within the same slot, reorder
        if ($inventory->binder_slot === $validated['to_slot']) {
            $this->reorderCardsInSlot($binderPage, $validated['to_slot'], $inventory->id, $position);
        } else {
            // Moving to a different slot
            // Shift existing cards at or after the target position
            UnifiedInventory::where('binder_page_id', $binderPage->id)
                ->where('binder_slot', $validated['to_slot'])
                ->where('position_in_slot', '>=', $position)
                ->increment('position_in_slot');

            // Update the card
            $inventory->update([
                'binder_slot' => $validated['to_slot'],
                'position_in_slot' => $position,
            ]);

            // Compact positions in the original slot
            $this->compactSlotPositions($binderPage, $inventory->getOriginal('binder_slot'));
        }

        return back();
    }

    /**
     * Reorder cards within a single slot.
     */
    public function reorderStack(Request $request, BinderPage $binderPage): RedirectResponse
    {
        $this->authorize('update', $binderPage);

        $validated = $request->validate([
            'slot' => ['required', 'integer', 'min:1', 'max:'.BinderPage::SLOTS_PER_PAGE],
            'order' => ['required', 'array', 'max:4'],
            'order.*' => ['integer', 'exists:unified_inventories,id'],
        ]);

        // Verify all cards belong to this slot and user
        $cardIds = $validated['order'];
        $validCards = UnifiedInventory::whereIn('id', $cardIds)
            ->where('binder_page_id', $binderPage->id)
            ->where('binder_slot', $validated['slot'])
            ->where('user_id', Auth::id())
            ->pluck('id')
            ->all();

        if (count($validCards) !== count($cardIds)) {
            return back()->withErrors(['order' => 'Ungültige Kartenreihenfolge.']);
        }

        // Update positions
        foreach ($cardIds as $position => $cardId) {
            UnifiedInventory::where('id', $cardId)->update(['position_in_slot' => $position]);
        }

        return back();
    }

    /**
     * Reorder cards within a slot when moving within the same slot.
     */
    private function reorderCardsInSlot(BinderPage $binderPage, int $slot, int $cardId, int $newPosition): void
    {
        $cards = UnifiedInventory::where('binder_page_id', $binderPage->id)
            ->where('binder_slot', $slot)
            ->orderBy('position_in_slot')
            ->get();

        // Remove the card being moved from its current position
        $filteredCards = $cards->filter(fn ($c) => $c->id !== $cardId)->values();

        // Insert at new position
        $newOrder = collect();
        foreach ($filteredCards as $index => $card) {
            if ($index === $newPosition) {
                $newOrder->push($cardId);
            }
            $newOrder->push($card->id);
        }

        // If new position is at the end
        if ($newPosition >= $filteredCards->count()) {
            $newOrder->push($cardId);
        }

        // Update all positions
        foreach ($newOrder as $position => $id) {
            UnifiedInventory::where('id', $id)->update(['position_in_slot' => $position]);
        }
    }

    /**
     * Compact positions in a slot after a card is removed.
     */
    private function compactSlotPositions(BinderPage $binderPage, ?int $slot): void
    {
        if ($slot === null) {
            return;
        }

        $cards = UnifiedInventory::where('binder_page_id', $binderPage->id)
            ->where('binder_slot', $slot)
            ->orderBy('position_in_slot')
            ->get();

        foreach ($cards as $index => $card) {
            if ($card->position_in_slot !== $index) {
                $card->update(['position_in_slot' => $index]);
            }
        }
    }

    /**
     * Get available collection cards that are not yet assigned to any binder.
     */
    public function availableCards(Request $request, BinderPage $binderPage): Response|JsonResponse
    {
        $this->authorize('view', $binderPage);

        $query = UnifiedInventory::where('user_id', Auth::id())
            ->where('in_collection', true)
            ->whereNull('binder_page_id')
            ->with(['printing.card', 'printing.set']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('printing.card', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        if ($request->filled('game')) {
            $query->whereHas('printing.card', fn ($q) => $q->where('game', $request->input('game')));
        }

        $cards = $query->orderBy('created_at', 'desc')
            ->paginate(24)
            ->withQueryString();

        // Return JSON for AJAX requests (used by card picker dialog)
        if ($request->wantsJson() || $request->ajax()) {
            return response()->json(['cards' => $cards]);
        }

        return Inertia::render('collection/binders/pages/available-cards', [
            'binderPage' => $binderPage->load('binder'),
            'cards' => $cards,
            'filters' => $request->only(['search', 'game']),
        ]);
    }
}
