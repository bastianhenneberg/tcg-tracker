<?php

namespace App\Http\Controllers\Op;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessInventoryAction;
use App\Models\Op\OpCollection;
use App\Models\Op\OpInventory;
use App\Models\Op\OpPrinting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OpInventoryController extends Controller
{
    public function index(Request $request): Response
    {
        $query = OpInventory::where('user_id', Auth::id())
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

        if ($request->filled('card_type')) {
            $query->whereHas('printing.card', fn ($q) => $q->where('card_type', $request->input('card_type')));
        }

        if ($request->filled('color')) {
            $color = $request->input('color');
            $query->whereHas('printing.card', fn ($q) => $q->where('color', $color)->orWhere('color_secondary', $color));
        }

        $inventory = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $statsQuery = OpInventory::where('user_id', Auth::id());

        return Inertia::render('op/inventory', [
            'inventory' => $inventory,
            'filters' => $request->only(['search', 'condition', 'lot', 'rarity', 'card_type', 'color']),
            'conditions' => OpInventory::CONDITIONS,
            'rarities' => OpPrinting::RARITIES,
            'cardTypes' => \App\Models\Op\OpCard::CARD_TYPES,
            'colors' => \App\Models\Op\OpCard::COLORS,
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
            'op_printing_id' => ['required', 'exists:op_printings,id'],
            'condition' => ['required', 'string', 'in:'.implode(',', array_keys(OpInventory::CONDITIONS))],
            'language' => ['nullable', 'string', 'in:'.implode(',', array_keys(OpInventory::LANGUAGES))],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $position = OpInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        OpInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $validated['lot_id'],
            'op_printing_id' => $validated['op_printing_id'],
            'condition' => $validated['condition'],
            'language' => $validated['language'] ?? 'EN',
            'price' => $validated['price'] ?? null,
            'position_in_lot' => $position + 1,
        ]);

        return back();
    }

    public function update(Request $request, OpInventory $item): RedirectResponse
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'condition' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys(OpInventory::CONDITIONS))],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(OpInventory $item): RedirectResponse
    {
        $this->authorize('delete', $item);

        $lotId = $item->lot_id;
        $item->delete();

        if ($lotId) {
            OpInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function deleteMultiple(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:op_inventory,id'],
            'async' => ['sometimes', 'boolean'],
        ]);

        $ids = $validated['ids'];

        if (count($ids) > 5 || ($validated['async'] ?? false)) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'delete_op_cards',
                ['ids' => $ids]
            );

            return back()->with('flash', [
                'type' => 'info',
                'message' => count($ids).' Karte(n) werden im Hintergrund gelöscht.',
            ]);
        }

        $affectedLotIds = OpInventory::whereIn('id', $ids)
            ->where('user_id', Auth::id())
            ->pluck('lot_id')
            ->unique()
            ->filter()
            ->toArray();

        OpInventory::whereIn('id', $ids)
            ->where('user_id', Auth::id())
            ->delete();

        foreach ($affectedLotIds as $lotId) {
            OpInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function markSold(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:op_inventory,id'],
            'sold_price' => ['nullable', 'numeric', 'min:0'],
            'async' => ['sometimes', 'boolean'],
        ]);

        $ids = $validated['ids'];

        if (count($ids) > 5 || ($validated['async'] ?? false)) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'mark_op_sold',
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

        $items = OpInventory::whereIn('id', $ids)
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
            'ids.*' => ['exists:op_inventory,id'],
            'async' => ['sometimes', 'boolean'],
        ]);

        $ids = $validated['ids'];

        if (count($ids) > 5 || ($validated['async'] ?? false)) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'move_op_to_collection',
                ['ids' => $ids]
            );

            return back()->with('flash', [
                'type' => 'info',
                'message' => count($ids).' Karte(n) werden im Hintergrund in die Sammlung verschoben.',
            ]);
        }

        $affectedLotIds = [];

        DB::transaction(function () use ($ids, &$affectedLotIds) {
            $items = OpInventory::whereIn('id', $ids)
                ->where('user_id', Auth::id())
                ->with('printing')
                ->get();

            $affectedLotIds = $items->pluck('lot_id')->unique()->filter()->toArray();

            foreach ($items as $item) {
                $existing = OpCollection::where('user_id', Auth::id())
                    ->where('op_printing_id', $item->op_printing_id)
                    ->where('condition', $item->condition)
                    ->where('language', $item->language ?? 'EN')
                    ->first();

                if ($existing) {
                    $existing->increment('quantity');
                } else {
                    OpCollection::create([
                        'user_id' => Auth::id(),
                        'op_printing_id' => $item->op_printing_id,
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
            OpInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }
}
