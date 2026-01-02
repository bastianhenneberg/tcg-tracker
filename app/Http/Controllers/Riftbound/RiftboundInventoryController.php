<?php

namespace App\Http\Controllers\Riftbound;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessInventoryAction;
use App\Models\Riftbound\RiftboundCollection;
use App\Models\Riftbound\RiftboundInventory;
use App\Models\Riftbound\RiftboundPrinting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RiftboundInventoryController extends Controller
{
    public function index(Request $request): Response
    {
        $query = RiftboundInventory::where('user_id', Auth::id())
            ->with(['printing.card', 'printing.set', 'lot.box'])
            ->whereNull('sold_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('printing.card', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('printing', fn ($p) => $p->where('collector_number', 'like', "%{$search}%"));
            });
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

        $statsQuery = RiftboundInventory::where('user_id', Auth::id());

        return Inertia::render('riftbound/inventory', [
            'inventory' => $inventory,
            'filters' => $request->only(['search', 'condition', 'lot', 'rarity', 'foiling']),
            'conditions' => RiftboundInventory::CONDITIONS,
            'rarities' => RiftboundPrinting::RARITIES,
            'foilings' => RiftboundPrinting::FOILINGS,
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
            'riftbound_printing_id' => ['required', 'exists:riftbound_printings,id'],
            'condition' => ['required', 'string', 'in:'.implode(',', array_keys(RiftboundInventory::CONDITIONS))],
            'language' => ['nullable', 'string'],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $position = RiftboundInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        RiftboundInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $validated['lot_id'],
            'riftbound_printing_id' => $validated['riftbound_printing_id'],
            'condition' => $validated['condition'],
            'language' => $validated['language'] ?? 'EN',
            'price' => $validated['price'] ?? null,
            'position_in_lot' => $position + 1,
        ]);

        return back();
    }

    public function update(Request $request, RiftboundInventory $item): RedirectResponse
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'condition' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys(RiftboundInventory::CONDITIONS))],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(RiftboundInventory $item): RedirectResponse
    {
        $this->authorize('delete', $item);

        $lotId = $item->lot_id;
        $item->delete();

        if ($lotId) {
            RiftboundInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function deleteMultiple(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:riftbound_inventory,id'],
            'async' => ['sometimes', 'boolean'],
        ]);

        $ids = $validated['ids'];

        if (count($ids) > 5 || ($validated['async'] ?? false)) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'delete_riftbound_cards',
                ['ids' => $ids]
            );

            return back()->with('flash', [
                'type' => 'info',
                'message' => count($ids).' Karte(n) werden im Hintergrund gelöscht.',
            ]);
        }

        $affectedLotIds = RiftboundInventory::whereIn('id', $ids)
            ->where('user_id', Auth::id())
            ->pluck('lot_id')
            ->unique()
            ->filter()
            ->toArray();

        RiftboundInventory::whereIn('id', $ids)
            ->where('user_id', Auth::id())
            ->delete();

        foreach ($affectedLotIds as $lotId) {
            RiftboundInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function markSold(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:riftbound_inventory,id'],
            'sold_price' => ['nullable', 'numeric', 'min:0'],
            'async' => ['sometimes', 'boolean'],
        ]);

        $ids = $validated['ids'];

        if (count($ids) > 5 || ($validated['async'] ?? false)) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'mark_riftbound_sold',
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

        $items = RiftboundInventory::whereIn('id', $ids)
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
            'ids.*' => ['exists:riftbound_inventory,id'],
            'async' => ['sometimes', 'boolean'],
        ]);

        $ids = $validated['ids'];

        if (count($ids) > 5 || ($validated['async'] ?? false)) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'move_riftbound_to_collection',
                ['ids' => $ids]
            );

            return back()->with('flash', [
                'type' => 'info',
                'message' => count($ids).' Karte(n) werden im Hintergrund in die Sammlung verschoben.',
            ]);
        }

        $affectedLotIds = [];

        DB::transaction(function () use ($ids, &$affectedLotIds) {
            $items = RiftboundInventory::whereIn('id', $ids)
                ->where('user_id', Auth::id())
                ->with('printing')
                ->get();

            $affectedLotIds = $items->pluck('lot_id')->unique()->filter()->toArray();

            foreach ($items as $item) {
                $existing = RiftboundCollection::where('user_id', Auth::id())
                    ->where('riftbound_printing_id', $item->riftbound_printing_id)
                    ->where('condition', $item->condition)
                    ->where('language', $item->language ?? 'EN')
                    ->first();

                if ($existing) {
                    $existing->increment('quantity');
                } else {
                    RiftboundCollection::create([
                        'user_id' => Auth::id(),
                        'riftbound_printing_id' => $item->riftbound_printing_id,
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
            RiftboundInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }
}
