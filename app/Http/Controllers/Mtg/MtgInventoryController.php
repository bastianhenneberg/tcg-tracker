<?php

namespace App\Http\Controllers\Mtg;

use App\Http\Controllers\Controller;
use App\Models\Mtg\MtgCollection;
use App\Models\Mtg\MtgInventory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class MtgInventoryController extends Controller
{
    public const CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DM' => 'Damaged',
    ];

    public const FINISHES = [
        'nonfoil' => 'Non-Foil',
        'foil' => 'Foil',
        'etched' => 'Etched Foil',
    ];

    public function index(Request $request): Response
    {
        $query = MtgInventory::where('user_id', Auth::id())
            ->with(['printing.card', 'printing.set', 'lot.box'])
            ->whereNull('sold_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('printing.card', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('printing', fn ($p) => $p->where('number', 'like', "%{$search}%"));
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

        if ($request->filled('finish')) {
            $query->where('finish', $request->input('finish'));
        }

        $inventory = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        return Inertia::render('mtg/inventory', [
            'inventory' => $inventory,
            'filters' => $request->only(['search', 'condition', 'lot', 'rarity', 'finish']),
            'conditions' => self::CONDITIONS,
            'finishes' => self::FINISHES,
            'rarities' => [
                'common' => 'Common',
                'uncommon' => 'Uncommon',
                'rare' => 'Rare',
                'mythic' => 'Mythic Rare',
            ],
            'stats' => [
                'total' => MtgInventory::where('user_id', Auth::id())->whereNull('sold_at')->count(),
                'sold' => MtgInventory::where('user_id', Auth::id())->whereNotNull('sold_at')->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'mtg_printing_id' => ['required', 'exists:mtg_printings,id'],
            'condition' => ['required', 'string', 'in:'.implode(',', array_keys(self::CONDITIONS))],
            'finish' => ['required', 'string', 'in:'.implode(',', array_keys(self::FINISHES))],
            'language' => ['nullable', 'string'],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $position = MtgInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        MtgInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $validated['lot_id'],
            'mtg_printing_id' => $validated['mtg_printing_id'],
            'condition' => $validated['condition'],
            'finish' => $validated['finish'],
            'language' => $validated['language'] ?? 'en',
            'price' => $validated['price'] ?? null,
            'position_in_lot' => $position + 1,
        ]);

        return back()->with('success', 'Karte zum Inventar hinzugefügt');
    }

    public function update(Request $request, MtgInventory $item): RedirectResponse
    {
        if ($item->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'condition' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys(self::CONDITIONS))],
            'finish' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys(self::FINISHES))],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(MtgInventory $item): RedirectResponse
    {
        if ($item->user_id !== Auth::id()) {
            abort(403);
        }

        $lotId = $item->lot_id;
        $item->delete();

        // Renumber positions in the lot
        if ($lotId) {
            $this->renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function deleteMultiple(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:mtg_inventory,id'],
        ]);

        $affectedLotIds = MtgInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->pluck('lot_id')
            ->unique()
            ->filter()
            ->toArray();

        MtgInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->delete();

        foreach ($affectedLotIds as $lotId) {
            $this->renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function markSold(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:mtg_inventory,id'],
            'sold_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $items = MtgInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->get();

        foreach ($items as $item) {
            $item->update([
                'sold_at' => now(),
                'sold_price' => $validated['sold_price'] ?? $item->price,
            ]);
        }

        return back()->with('success', count($items).' Karte(n) als verkauft markiert');
    }

    public function moveToCollection(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:mtg_inventory,id'],
        ]);

        $affectedLotIds = [];

        DB::transaction(function () use ($validated, &$affectedLotIds) {
            $items = MtgInventory::whereIn('id', $validated['ids'])
                ->where('user_id', Auth::id())
                ->with('printing')
                ->get();

            $affectedLotIds = $items->pluck('lot_id')->unique()->filter()->toArray();

            foreach ($items as $item) {
                $existing = MtgCollection::where('user_id', Auth::id())
                    ->where('mtg_printing_id', $item->mtg_printing_id)
                    ->where('condition', $item->condition)
                    ->where('finish', $item->finish)
                    ->where('language', $item->language ?? 'en')
                    ->first();

                if ($existing) {
                    $existing->increment('quantity');
                } else {
                    MtgCollection::create([
                        'user_id' => Auth::id(),
                        'mtg_printing_id' => $item->mtg_printing_id,
                        'condition' => $item->condition,
                        'finish' => $item->finish,
                        'language' => $item->language ?? 'en',
                        'quantity' => 1,
                        'source_lot_id' => $item->lot_id,
                    ]);
                }

                $item->delete();
            }
        });

        foreach ($affectedLotIds as $lotId) {
            $this->renumberPositionsInLot($lotId);
        }

        return back()->with('success', 'Karten in Sammlung verschoben');
    }

    private function renumberPositionsInLot(int $lotId): void
    {
        $items = MtgInventory::where('lot_id', $lotId)
            ->orderBy('position_in_lot')
            ->get();

        $position = 1;
        foreach ($items as $item) {
            if ($item->position_in_lot !== $position) {
                $item->update(['position_in_lot' => $position]);
            }
            $position++;
        }
    }
}
