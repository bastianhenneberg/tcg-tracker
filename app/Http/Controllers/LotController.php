<?php

namespace App\Http\Controllers;

use App\Models\Box;
use App\Models\Lot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class LotController extends Controller
{
    public function index(): Response
    {
        $lots = Lot::where('user_id', Auth::id())
            ->with('box')
            ->withCount('inventoryItems')
            ->orderByDesc('lot_number')
            ->paginate(24)
            ->withQueryString();

        return Inertia::render('inventory/lots/index', [
            'lots' => $lots,
            'boxes' => Box::where('user_id', Auth::id())->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'box_id' => ['required', 'exists:boxes,id'],
            'card_range_start' => ['nullable', 'integer', 'min:1'],
            'card_range_end' => ['nullable', 'integer', 'min:1', 'gte:card_range_start'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $box = Box::findOrFail($validated['box_id']);
        $this->authorize('view', $box);

        Lot::create([
            'user_id' => Auth::id(),
            'box_id' => $validated['box_id'],
            'lot_number' => Lot::nextLotNumber(Auth::id()),
            'card_range_start' => $validated['card_range_start'] ?? null,
            'card_range_end' => $validated['card_range_end'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'scanned_at' => now(),
        ]);

        return back();
    }

    public function show(Request $request, Lot $lot): Response
    {
        $this->authorize('view', $lot);

        $lot->load('box');

        // Build paginated inventory query with filters
        $query = $lot->inventoryItems()
            ->with(['printing.card', 'printing.set']);

        // Sorting
        $sortField = $request->input('sort', 'created_at');
        $sortDirection = strtolower($request->input('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        // Join for sorting on related tables
        if (in_array($sortField, ['name', 'set', 'rarity', 'foiling'])) {
            $query->join('unified_printings', 'unified_printings.id', '=', 'unified_inventories.printing_id')
                ->join('unified_cards', 'unified_cards.id', '=', 'unified_printings.card_id')
                ->select('unified_inventories.*');
        }

        switch ($sortField) {
            case 'name':
                $query->orderBy('unified_cards.name', $sortDirection);
                break;
            case 'set':
                $query->orderBy('unified_printings.set_name', $sortDirection);
                break;
            case 'rarity':
                $query->orderBy('unified_printings.rarity', $sortDirection);
                break;
            case 'foiling':
                $query->orderBy('unified_printings.finish', $sortDirection);
                break;
            case 'condition':
                $query->orderBy('unified_inventories.condition', $sortDirection);
                break;
            case 'position':
                $query->orderByRaw("JSON_EXTRACT(unified_inventories.extra, '$.position_in_lot') {$sortDirection}");
                break;
            default:
                $query->orderBy('unified_inventories.created_at', $sortDirection);
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('printing.card', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        // Condition filter
        if ($request->filled('condition')) {
            $query->where('condition', $request->input('condition'));
        }

        // Foiling filter
        if ($request->filled('foiling')) {
            $query->whereHas('printing', fn ($q) => $q->where('finish', $request->input('foiling')));
        }

        // Rarity filter
        if ($request->filled('rarity')) {
            $query->whereHas('printing', fn ($q) => $q->where('rarity', $request->input('rarity')));
        }

        $items = $query->paginate(25)->withQueryString();

        // Get distinct foilings and rarities for filter options
        $foilings = $lot->inventoryItems()
            ->with('printing')
            ->get()
            ->pluck('printing.finish', 'printing.finish')
            ->filter()
            ->unique()
            ->mapWithKeys(fn ($v, $k) => [$k => $lot->inventoryItems()
                ->whereHas('printing', fn ($q) => $q->where('finish', $k))
                ->first()?->printing?->finish_label ?? $k])
            ->toArray();

        $rarities = $lot->inventoryItems()
            ->with('printing')
            ->get()
            ->pluck('printing.rarity', 'printing.rarity')
            ->filter()
            ->unique()
            ->mapWithKeys(fn ($v, $k) => [$k => $lot->inventoryItems()
                ->whereHas('printing', fn ($q) => $q->where('rarity', $k))
                ->first()?->printing?->rarity_label ?? $k])
            ->toArray();

        // Get other lots for "change lot" functionality
        $otherLots = Lot::where('user_id', Auth::id())
            ->where('id', '!=', $lot->id)
            ->with('box:id,name')
            ->orderByDesc('lot_number')
            ->get(['id', 'lot_number', 'box_id'])
            ->map(fn ($l) => [
                'id' => $l->id,
                'lot_number' => $l->lot_number,
                'name' => $l->box ? "{$l->box->name} - Lot #{$l->lot_number}" : "Lot #{$l->lot_number}",
            ]);

        return Inertia::render('inventory/lots/show', [
            'lot' => $lot,
            'items' => $items,
            'boxes' => Box::where('user_id', Auth::id())->orderBy('name')->get(),
            'otherLots' => $otherLots,
            'filters' => $request->only(['search', 'condition', 'foiling', 'rarity', 'sort', 'direction']),
            'conditions' => [
                'NM' => 'Near Mint',
                'LP' => 'Lightly Played',
                'MP' => 'Moderately Played',
                'HP' => 'Heavily Played',
                'DMG' => 'Damaged',
            ],
            'foilings' => $foilings,
            'rarities' => $rarities,
            'stats' => [
                'total' => $lot->inventoryItems()->count(),
            ],
        ]);
    }

    public function update(Request $request, Lot $lot): RedirectResponse
    {
        $this->authorize('update', $lot);

        $validated = $request->validate([
            'box_id' => ['required', 'exists:boxes,id'],
            'card_range_start' => ['nullable', 'integer', 'min:1'],
            'card_range_end' => ['nullable', 'integer', 'min:1', 'gte:card_range_start'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $box = Box::findOrFail($validated['box_id']);
        $this->authorize('view', $box);

        $lot->update($validated);

        return back();
    }

    public function destroy(Lot $lot): RedirectResponse
    {
        $this->authorize('delete', $lot);

        $lot->delete();

        return redirect()->route('lots.index');
    }
}
