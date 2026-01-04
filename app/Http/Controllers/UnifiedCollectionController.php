<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\UnifiedInventory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class UnifiedCollectionController extends Controller
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

    // ========== COLLECTION ==========

    public function index(Request $request, string $slug): Response
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);
        $userId = Auth::id();

        $query = UnifiedInventory::query()
            ->where('user_id', $userId)
            ->where('is_collection', true)
            ->with(['printing.card', 'printing.set'])
            ->whereHas('printing.card', fn ($q) => $q->where('game', $unifiedSlug));

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('printing.card', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        if ($request->filled('condition')) {
            $query->where('condition', $request->input('condition'));
        }

        if ($request->filled('set')) {
            $query->whereHas('printing', fn ($q) => $q->where('set_id', $request->input('set')));
        }

        $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $totalCards = UnifiedInventory::where('user_id', $userId)
            ->where('is_collection', true)
            ->whereHas('printing.card', fn ($q) => $q->where('game', $unifiedSlug))
            ->sum('quantity');

        $uniqueCards = UnifiedInventory::where('user_id', $userId)
            ->where('is_collection', true)
            ->whereHas('printing.card', fn ($q) => $q->where('game', $unifiedSlug))
            ->distinct('printing_id')
            ->count('printing_id');

        return Inertia::render('collection/index', [
            'game' => $game,
            'collection' => $collection,
            'filters' => $request->only(['search', 'condition', 'set']),
            'conditions' => $this->getConditions($game),
            'foilings' => $this->getFoilings($game),
            'stats' => [
                'total' => $totalCards,
                'unique' => $uniqueCards,
            ],
        ]);
    }

    public function update(Request $request, string $slug, UnifiedInventory $item): RedirectResponse
    {
        $game = $this->getGame($slug);

        if ($item->user_id !== Auth::id() || ! $item->is_collection) {
            abort(403);
        }

        $conditions = $this->getConditions($game);

        $validated = $request->validate([
            'quantity' => ['sometimes', 'required', 'integer', 'min:1'],
            'condition' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys($conditions))],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(string $slug, UnifiedInventory $item): RedirectResponse
    {
        $this->getGame($slug);

        if ($item->user_id !== Auth::id() || ! $item->is_collection) {
            abort(403);
        }

        $item->delete();

        return back();
    }

    public function destroyMultiple(Request $request, string $slug): RedirectResponse
    {
        $this->getGame($slug);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:unified_inventories,id'],
        ]);

        UnifiedInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->where('is_collection', true)
            ->delete();

        return back();
    }

    public function moveToInventory(Request $request, string $slug): RedirectResponse
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:unified_inventories,id'],
            'lot_id' => ['required', 'exists:lots,id'],
        ]);

        $items = UnifiedInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->where('is_collection', true)
            ->with('printing.card')
            ->get();

        // Filter to only items from this game
        $items = $items->filter(fn ($item) => $item->printing->card->game === $unifiedSlug);

        $position = UnifiedInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        foreach ($items as $item) {
            // If quantity > 1, decrement and create new inventory item
            if ($item->quantity > 1) {
                $item->decrement('quantity');

                UnifiedInventory::create([
                    'user_id' => Auth::id(),
                    'printing_id' => $item->printing_id,
                    'lot_id' => $validated['lot_id'],
                    'condition' => $item->condition,
                    'language' => $item->language,
                    'quantity' => 1,
                    'is_collection' => false,
                    'position_in_lot' => ++$position,
                ]);
            } else {
                // Move the entire item
                $item->update([
                    'lot_id' => $validated['lot_id'],
                    'is_collection' => false,
                    'position_in_lot' => ++$position,
                ]);
            }
        }

        return back()->with('success', count($items).' Karte(n) ins Inventar verschoben');
    }
}
