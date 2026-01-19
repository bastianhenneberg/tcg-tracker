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

        $binderPage->load(['binder', 'inventoryItems.printing.card', 'inventoryItems.printing.set']);

        $slots = [];
        $itemsBySlot = $binderPage->inventoryItems->groupBy('binder_slot');

        for ($i = 1; $i <= BinderPage::SLOTS_PER_PAGE; $i++) {
            // Each slot can hold up to 4 cards
            $slots[$i] = $itemsBySlot->get($i, collect())->take(4)->values()->all();
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
