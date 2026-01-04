<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\Lot;
use App\Models\UnifiedInventory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UnifiedInventoryController extends Controller
{
    /**
     * Map game slugs from games table to unified table game column.
     */
    private const GAME_SLUG_MAP = [
        'fab' => 'fab',
        'magic-the-gathering' => 'mtg',
        'onepiece' => 'onepiece',
        'riftbound' => 'riftbound',
    ];

    /**
     * Default conditions for all games.
     */
    private const DEFAULT_CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DMG' => 'Damaged',
    ];

    private function getGame(string $slug): Game
    {
        return Game::where('slug', $slug)
            ->where('is_official', true)
            ->firstOrFail();
    }

    private function getUnifiedGameSlug(string $slug): string
    {
        return self::GAME_SLUG_MAP[$slug] ?? $slug;
    }

    private function getConditions(Game $game): array
    {
        $conditions = $game->getConditions();

        return ! empty($conditions) ? $conditions : self::DEFAULT_CONDITIONS;
    }

    private function getFoilings(Game $game): array
    {
        return $game->getFoilings();
    }

    // ========== INVENTORY ==========

    public function index(Request $request, string $slug): Response
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);
        $userId = Auth::id();

        $query = UnifiedInventory::query()
            ->where('user_id', $userId)
            ->where('in_collection', false)
            ->with(['printing.card', 'lot.box'])
            ->whereHas('printing.card', fn ($q) => $q->where('game', $unifiedSlug));

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

        $inventory = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $lots = Lot::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'lot_number', 'notes']);

        return Inertia::render('inventory/index', [
            'game' => $game,
            'inventory' => $inventory,
            'filters' => $request->only(['search', 'condition', 'lot']),
            'conditions' => $this->getConditions($game),
            'foilings' => $this->getFoilings($game),
            'lots' => $lots,
            'stats' => [
                'total' => UnifiedInventory::where('user_id', $userId)
                    ->where('in_collection', false)
                    ->whereHas('printing.card', fn ($q) => $q->where('game', $unifiedSlug))
                    ->count(),
                'sold' => 0, // TODO: Implement sold tracking in unified schema
            ],
        ]);
    }

    public function update(Request $request, string $slug, UnifiedInventory $item): RedirectResponse
    {
        $game = $this->getGame($slug);

        if ($item->user_id !== Auth::id()) {
            abort(403);
        }

        $conditions = $this->getConditions($game);

        $validated = $request->validate([
            'condition' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys($conditions))],
            'price' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(string $slug, UnifiedInventory $item): RedirectResponse
    {
        $this->getGame($slug);

        if ($item->user_id !== Auth::id()) {
            abort(403);
        }

        $lotId = $item->lot_id;
        $item->delete();

        if ($lotId) {
            $this->renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function destroyMultiple(Request $request, string $slug): RedirectResponse
    {
        $this->getGame($slug);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:unified_inventories,id'],
        ]);

        $affectedLotIds = UnifiedInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->pluck('lot_id')
            ->unique()
            ->filter()
            ->toArray();

        UnifiedInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->delete();

        foreach ($affectedLotIds as $lotId) {
            $this->renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function markSold(Request $request, string $slug): RedirectResponse
    {
        $this->getGame($slug);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:unified_inventories,id'],
            'sold_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        // Delete sold items from inventory (unified schema doesn't track sold items separately)
        UnifiedInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->delete();

        return back()->with('success', count($validated['ids']).' Karte(n) als verkauft markiert und entfernt');
    }

    public function moveToCollection(Request $request, string $slug): RedirectResponse
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:unified_inventories,id'],
        ]);

        $affectedLotIds = [];

        DB::transaction(function () use ($validated, $unifiedSlug, &$affectedLotIds) {
            $items = UnifiedInventory::whereIn('id', $validated['ids'])
                ->where('user_id', Auth::id())
                ->with('printing.card')
                ->get();

            // Filter to only items from this game
            $items = $items->filter(fn ($item) => $item->printing->card->game === $unifiedSlug);

            $affectedLotIds = $items->pluck('lot_id')->unique()->filter()->toArray();

            foreach ($items as $item) {
                // Check if collection entry already exists
                $existing = UnifiedInventory::where('user_id', Auth::id())
                    ->where('printing_id', $item->printing_id)
                    ->where('condition', $item->condition)
                    ->where('language', $item->language)
                    ->where('in_collection', true)
                    ->first();

                if ($existing) {
                    $existing->increment('quantity');
                } else {
                    UnifiedInventory::create([
                        'user_id' => Auth::id(),
                        'printing_id' => $item->printing_id,
                        'condition' => $item->condition,
                        'language' => $item->language,
                        'quantity' => 1,
                        'in_collection' => true,
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
        // Position is stored in extra JSON field, renumbering is optional for unified schema
        $items = UnifiedInventory::where('lot_id', $lotId)
            ->orderBy('created_at')
            ->get();

        $position = 1;
        foreach ($items as $item) {
            $extra = $item->extra ?? [];
            $extra['position_in_lot'] = $position++;
            $item->update(['extra' => $extra]);
        }
    }
}
