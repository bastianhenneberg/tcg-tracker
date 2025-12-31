<?php

namespace App\Http\Controllers\Fab;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessInventoryAction;
use App\Models\Fab\FabCollection;
use App\Models\Fab\FabInventory;
use App\Models\Fab\FabPrinting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FabInventoryController extends Controller
{
    public function index(Request $request): Response
    {
        $query = FabInventory::where('user_id', Auth::id())
            ->with(['printing.card', 'printing.set', 'lot.box'])
            ->whereNull('sold_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('printing.card', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        if ($request->filled('condition')) {
            $query->where('condition', $request->input('condition'));
        }

        if ($request->filled('lot')) {
            $query->where('lot_id', $request->input('lot'));
        }

        if ($request->filled('rarity')) {
            $query->whereHas('printing', fn ($q) => $q->where('rarity', $request->input('rarity')));
        }

        if ($request->filled('foiling')) {
            $query->whereHas('printing', fn ($q) => $q->where('foiling', $request->input('foiling')));
        }

        $inventory = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $statsQuery = FabInventory::where('user_id', Auth::id());

        return Inertia::render('fab/inventory', [
            'inventory' => $inventory,
            'filters' => $request->only(['search', 'condition', 'lot', 'rarity', 'foiling']),
            'conditions' => FabInventory::CONDITIONS,
            'rarities' => FabPrinting::RARITIES,
            'foilings' => FabPrinting::FOILINGS,
            'stats' => [
                'total' => (clone $statsQuery)->whereNull('sold_at')->count(),
                'sold' => (clone $statsQuery)->whereNotNull('sold_at')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'fab_printing_id' => ['required', 'exists:fab_printings,id'],
            'condition' => ['required', 'string', 'in:'.implode(',', array_keys(FabInventory::CONDITIONS))],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $position = FabInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        FabInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $validated['lot_id'],
            'fab_printing_id' => $validated['fab_printing_id'],
            'condition' => $validated['condition'],
            'price' => $validated['price'] ?? null,
            'position_in_lot' => $position + 1,
        ]);

        return back();
    }

    public function update(Request $request, FabInventory $item): RedirectResponse
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'condition' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys(FabInventory::CONDITIONS))],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(FabInventory $item): RedirectResponse
    {
        $this->authorize('delete', $item);

        $lotId = $item->lot_id;
        $item->delete();

        // Renumber positions in the lot
        if ($lotId) {
            FabInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function deleteMultiple(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:fab_inventory,id'],
            'async' => ['sometimes', 'boolean'],
        ]);

        $ids = $validated['ids'];

        // Use queue for batch operations with more than 5 items or when explicitly requested
        if (count($ids) > 5 || ($validated['async'] ?? false)) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'delete_cards',
                ['ids' => $ids]
            );

            return back()->with('flash', [
                'type' => 'info',
                'message' => count($ids).' Karte(n) werden im Hintergrund gelöscht.',
            ]);
        }

        // Sync processing for small batches
        $affectedLotIds = FabInventory::whereIn('id', $ids)
            ->where('user_id', Auth::id())
            ->pluck('lot_id')
            ->unique()
            ->filter()
            ->toArray();

        FabInventory::whereIn('id', $ids)
            ->where('user_id', Auth::id())
            ->delete();

        foreach ($affectedLotIds as $lotId) {
            FabInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function markSold(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:fab_inventory,id'],
            'sold_price' => ['nullable', 'numeric', 'min:0'],
            'async' => ['sometimes', 'boolean'],
        ]);

        $ids = $validated['ids'];

        // Use queue for batch operations with more than 5 items
        if (count($ids) > 5 || ($validated['async'] ?? false)) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'mark_sold',
                [
                    'ids' => $ids,
                    'sold_price' => $validated['sold_price'] ?? null,
                ]
            );

            return back()->with('flash', [
                'type' => 'info',
                'message' => count($ids).' Karte(n) werden im Hintergrund als verkauft markiert.',
            ]);
        }

        // Sync processing for small batches
        $items = FabInventory::whereIn('id', $ids)
            ->where('user_id', Auth::id())
            ->get();

        foreach ($items as $item) {
            $item->update([
                'sold_at' => now(),
                'sold_price' => $validated['sold_price'] ?? $item->price,
            ]);
        }

        return back();
    }

    public function moveToCollection(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:fab_inventory,id'],
            'async' => ['sometimes', 'boolean'],
        ]);

        $ids = $validated['ids'];

        // Use queue for batch operations with more than 5 items
        if (count($ids) > 5 || ($validated['async'] ?? false)) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'move_to_collection',
                ['ids' => $ids]
            );

            return back()->with('flash', [
                'type' => 'info',
                'message' => count($ids).' Karte(n) werden im Hintergrund in die Sammlung verschoben.',
            ]);
        }

        // Sync processing for small batches
        $affectedLotIds = [];

        DB::transaction(function () use ($ids, &$affectedLotIds) {
            $items = FabInventory::whereIn('id', $ids)
                ->where('user_id', Auth::id())
                ->with('printing')
                ->get();

            $affectedLotIds = $items->pluck('lot_id')->unique()->filter()->toArray();

            foreach ($items as $item) {
                $existing = FabCollection::where('user_id', Auth::id())
                    ->where('fab_printing_id', $item->fab_printing_id)
                    ->where('condition', $item->condition)
                    ->where('language', $item->language ?? 'EN')
                    ->first();

                if ($existing) {
                    $existing->increment('quantity');
                } else {
                    FabCollection::create([
                        'user_id' => Auth::id(),
                        'fab_printing_id' => $item->fab_printing_id,
                        'condition' => $item->condition,
                        'language' => $item->language ?? 'EN',
                        'quantity' => 1,
                        'source_lot_id' => $item->lot_id,
                    ]);
                }

                $item->delete();
            }
        });

        foreach ($affectedLotIds as $lotId) {
            FabInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }
}
