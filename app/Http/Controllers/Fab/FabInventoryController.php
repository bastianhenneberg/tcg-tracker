<?php

namespace App\Http\Controllers\Fab;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessInventoryAction;
use App\Models\Custom\CustomInventory;
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
        // FAB inventory query
        $fabQuery = FabInventory::where('user_id', Auth::id())
            ->with(['printing.card', 'printing.set', 'lot.box'])
            ->whereNull('sold_at');

        // Custom inventory query
        $customQuery = CustomInventory::where('user_id', Auth::id())
            ->with(['printing.card.linkedFabCard.printings', 'lot.box'])
            ->whereNull('sold_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $fabQuery->where(function ($q) use ($search) {
                $q->whereHas('printing.card', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('printing', fn ($p) => $p->where('collector_number', 'like', "%{$search}%"));
            });
            $customQuery->where(function ($q) use ($search) {
                $q->whereHas('printing.card', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('printing', fn ($p) => $p->where('collector_number', 'like', "%{$search}%")
                        ->orWhere('set_name', 'like', "%{$search}%")
                        ->orWhereRaw("CONCAT(COALESCE(set_name, ''), COALESCE(collector_number, '')) LIKE ?", ["%{$search}%"]));
            });
        }

        if ($request->filled('condition')) {
            $fabQuery->where('condition', $request->input('condition'));
            $customQuery->where('condition', $request->input('condition'));
        }

        if ($request->filled('lot')) {
            $fabQuery->where('lot_id', $request->input('lot'));
            $customQuery->where('lot_id', $request->input('lot'));
        }

        if ($request->filled('rarity')) {
            $fabQuery->whereHas('printing', fn ($q) => $q->where('rarity', $request->input('rarity')));
            $customQuery->whereHas('printing', fn ($q) => $q->where('rarity', $request->input('rarity')));
        }

        if ($request->filled('foiling')) {
            $fabQuery->whereHas('printing', fn ($q) => $q->where('foiling', $request->input('foiling')));
            $customQuery->whereHas('printing', fn ($q) => $q->where('foiling', $request->input('foiling')));
        }

        // Get both inventories and normalize
        $fabItems = $fabQuery->orderByDesc('created_at')->get()->map(fn ($item) => [
            'id' => $item->id,
            'is_custom' => false,
            'printing_id' => $item->fab_printing_id,
            'card_id' => $item->printing->fab_card_id,
            'card_name' => $item->printing->card->name,
            'set_name' => $item->printing->set->name ?? $item->printing->set->external_id,
            'collector_number' => $item->printing->collector_number,
            'rarity' => $item->printing->rarity,
            'rarity_label' => $item->printing->rarity_label,
            'foiling' => $item->printing->foiling,
            'foiling_label' => $item->printing->foiling_label,
            'image_url' => $item->printing->image_url,
            'condition' => $item->condition,
            'condition_label' => FabInventory::CONDITIONS[$item->condition] ?? $item->condition,
            'language' => $item->language,
            'price' => $item->price,
            'lot_id' => $item->lot_id,
            'lot_number' => $item->lot?->lot_number,
            'box_name' => $item->lot?->box?->name,
            'position_in_lot' => $item->position_in_lot,
            'created_at' => $item->created_at->toIso8601String(),
        ]);

        $customItems = $customQuery->orderByDesc('created_at')->get()->map(fn ($item) => [
            'id' => $item->id,
            'is_custom' => true,
            'printing_id' => $item->custom_printing_id,
            'card_id' => $item->printing->custom_card_id,
            'card_name' => $item->printing->card->name,
            'set_name' => $item->printing->set_name ?? 'Custom',
            'collector_number' => ($item->printing->set_name ?? '').($item->printing->collector_number ?? '') ?: '-',
            'rarity' => $item->printing->rarity,
            'rarity_label' => $item->printing->rarity ? (FabPrinting::RARITIES[$item->printing->rarity] ?? $item->printing->rarity) : null,
            'foiling' => $item->printing->foiling,
            'foiling_label' => $item->printing->foiling ? (FabPrinting::FOILINGS[$item->printing->foiling] ?? $item->printing->foiling) : null,
            // Image priority: custom > parent > null
            'image_url' => $item->printing->image_url ?? $item->printing->card->linkedFabCard?->printings?->first()?->image_url,
            'condition' => $item->condition,
            'condition_label' => CustomInventory::CONDITIONS[$item->condition] ?? $item->condition,
            'language' => $item->language,
            'price' => $item->price,
            'lot_id' => $item->lot_id,
            'lot_number' => $item->lot?->lot_number,
            'box_name' => $item->lot?->box?->name,
            'position_in_lot' => $item->position_in_lot,
            'created_at' => $item->created_at->toIso8601String(),
        ]);

        // Merge and sort by created_at
        $allItems = $fabItems->concat($customItems)
            ->sortByDesc('created_at')
            ->values();

        // Manual pagination
        $page = $request->input('page', 1);
        $perPage = 24;
        $total = $allItems->count();
        $items = $allItems->forPage($page, $perPage)->values();

        $inventory = new \Illuminate\Pagination\LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        $fabStatsQuery = FabInventory::where('user_id', Auth::id());
        $customStatsQuery = CustomInventory::where('user_id', Auth::id());

        return Inertia::render('fab/inventory', [
            'inventory' => $inventory,
            'filters' => $request->only(['search', 'condition', 'lot', 'rarity', 'foiling']),
            'conditions' => FabInventory::CONDITIONS,
            'rarities' => FabPrinting::RARITIES,
            'foilings' => FabPrinting::FOILINGS,
            'stats' => [
                'total' => (clone $fabStatsQuery)->whereNull('sold_at')->count() + (clone $customStatsQuery)->whereNull('sold_at')->count(),
                'sold' => (clone $fabStatsQuery)->whereNotNull('sold_at')->count() + (clone $customStatsQuery)->whereNotNull('sold_at')->count(),
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

    public function deleteMultipleCustom(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:custom_inventory,id'],
        ]);

        $ids = $validated['ids'];

        $affectedLotIds = CustomInventory::whereIn('id', $ids)
            ->where('user_id', Auth::id())
            ->pluck('lot_id')
            ->unique()
            ->filter()
            ->toArray();

        CustomInventory::whereIn('id', $ids)
            ->where('user_id', Auth::id())
            ->delete();

        foreach ($affectedLotIds as $lotId) {
            CustomInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }
}
