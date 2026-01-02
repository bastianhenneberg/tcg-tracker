<?php

namespace App\Http\Controllers;

use App\Models\Box;
use App\Models\Custom\CustomCard;
use App\Models\Custom\CustomCollection;
use App\Models\Custom\CustomInventory;
use App\Models\Custom\CustomPrinting;
use App\Models\Game;
use App\Models\Lot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomGameController extends Controller
{
    /**
     * Get the game by slug and verify access.
     */
    private function getGame(string $slug): Game
    {
        $game = Game::where('slug', $slug)->firstOrFail();

        // Users can access official games or their own custom games
        if (! $game->is_official && $game->user_id !== Auth::id()) {
            abort(403, 'Kein Zugriff auf dieses Spiel');
        }

        return $game;
    }

    /**
     * Get conditions from game attributes or defaults.
     */
    private function getConditions(Game $game): array
    {
        $conditions = $game->getConditions();

        return ! empty($conditions) ? $conditions : [
            'NM' => 'Near Mint',
            'LP' => 'Lightly Played',
            'MP' => 'Moderately Played',
            'HP' => 'Heavily Played',
            'DMG' => 'Damaged',
        ];
    }

    /**
     * Get foilings from game attributes.
     */
    private function getFoilings(Game $game): array
    {
        return $game->getFoilings();
    }

    /**
     * Get rarities from game attributes.
     */
    private function getRarities(Game $game): array
    {
        return $game->getRarities();
    }

    // ========== SCANNER ==========

    public function scanner(Request $request, string $slug): Response
    {
        $game = $this->getGame($slug);
        $user = Auth::user();

        $lots = Lot::where('user_id', $user->id)
            ->with('box')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $boxes = Box::where('user_id', $user->id)
            ->orderBy('name')
            ->get();

        // Search results
        $searchResults = [];
        if ($request->filled('q') && strlen($request->input('q')) >= 2) {
            $searchResults = $this->searchCards($game, $request->input('q'), 20);
        }

        return Inertia::render('games/scanner', [
            'game' => $game,
            'lots' => $lots,
            'boxes' => $boxes,
            'conditions' => $this->getConditions($game),
            'foilings' => $this->getFoilings($game),
            'rarities' => $this->getRarities($game),
            'searchResults' => $searchResults,
            'searchQuery' => $request->input('q', ''),
        ]);
    }

    public function search(Request $request, string $slug): Response
    {
        $game = $this->getGame($slug);
        $query = $request->input('q', '');
        $results = $this->searchCards($game, $query, 20);

        return Inertia::render('games/scanner', [
            'game' => $game,
            'searchResults' => $results,
            'searchQuery' => $query,
        ]);
    }

    private function searchCards(Game $game, string $query, int $limit = 20): array
    {
        if (strlen($query) < 2) {
            return [];
        }

        $userId = Auth::id();

        // Search custom cards for this game
        return CustomPrinting::query()
            ->with(['card'])
            ->whereHas('card', function ($q) use ($game, $userId, $query) {
                $q->where('game_id', $game->id)
                    ->where('user_id', $userId)
                    ->where('name', 'like', "%{$query}%");
            })
            ->limit($limit)
            ->get()
            ->map(fn ($printing) => [
                'id' => $printing->id,
                'card_id' => $printing->card->id,
                'card_name' => $printing->card->name,
                'set_name' => $printing->set_name ?? 'Custom',
                'collector_number' => $printing->collector_number ?? '-',
                'rarity' => $printing->rarity,
                'foiling' => $printing->foiling,
                'image_url' => $printing->image_url,
                'is_custom' => true,
            ])
            ->values()
            ->toArray();
    }

    public function confirm(Request $request, string $slug): RedirectResponse
    {
        $game = $this->getGame($slug);
        $conditions = $this->getConditions($game);

        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'custom_printing_id' => ['required', 'exists:custom_printings,id'],
            'condition' => ['required', 'string', 'in:'.implode(',', array_keys($conditions))],
            'language' => ['nullable', 'string'],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        // Verify lot belongs to user
        $lot = Lot::findOrFail($validated['lot_id']);
        if ($lot->user_id !== Auth::id()) {
            abort(403, 'Lot gehört nicht dir');
        }

        // Verify printing belongs to user and game
        $printing = CustomPrinting::with('card')->findOrFail($validated['custom_printing_id']);
        if ($printing->user_id !== Auth::id() || $printing->card->game_id !== $game->id) {
            abort(403, 'Karte gehört nicht dir oder nicht zu diesem Spiel');
        }

        $position = CustomInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        CustomInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $validated['lot_id'],
            'custom_printing_id' => $validated['custom_printing_id'],
            'condition' => $validated['condition'],
            'language' => $validated['language'] ?? 'DE',
            'price' => $validated['price'] ?? null,
            'position_in_lot' => $position + 1,
        ]);

        return back()->with('success', 'Karte hinzugefügt');
    }

    public function createLot(Request $request, string $slug): RedirectResponse
    {
        $this->getGame($slug); // Verify access

        $validated = $request->validate([
            'box_id' => ['nullable', 'exists:boxes,id'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        // Verify box belongs to user if provided
        if (isset($validated['box_id'])) {
            $box = Box::findOrFail($validated['box_id']);
            if ($box->user_id !== Auth::id()) {
                abort(403, 'Box gehört nicht dir');
            }
        }

        $nextLotNumber = Lot::where('user_id', Auth::id())->max('lot_number') + 1;

        $lot = Lot::create([
            'user_id' => Auth::id(),
            'box_id' => $validated['box_id'] ?? null,
            'lot_number' => $nextLotNumber,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', "Lot #{$lot->lot_number} erstellt");
    }

    // ========== INVENTORY ==========

    public function inventory(Request $request, string $slug): Response
    {
        $game = $this->getGame($slug);
        $userId = Auth::id();

        $query = CustomInventory::where('user_id', $userId)
            ->with(['printing.card', 'lot.box'])
            ->whereHas('printing.card', fn ($q) => $q->where('game_id', $game->id))
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

        $inventory = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        return Inertia::render('games/inventory', [
            'game' => $game,
            'inventory' => $inventory,
            'filters' => $request->only(['search', 'condition', 'lot']),
            'conditions' => $this->getConditions($game),
            'foilings' => $this->getFoilings($game),
            'stats' => [
                'total' => CustomInventory::where('user_id', $userId)
                    ->whereHas('printing.card', fn ($q) => $q->where('game_id', $game->id))
                    ->whereNull('sold_at')
                    ->count(),
                'sold' => CustomInventory::where('user_id', $userId)
                    ->whereHas('printing.card', fn ($q) => $q->where('game_id', $game->id))
                    ->whereNotNull('sold_at')
                    ->count(),
            ],
        ]);
    }

    public function inventoryUpdate(Request $request, string $slug, CustomInventory $item): RedirectResponse
    {
        $game = $this->getGame($slug);

        if ($item->user_id !== Auth::id()) {
            abort(403);
        }

        $conditions = $this->getConditions($game);

        $validated = $request->validate([
            'condition' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys($conditions))],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $item->update($validated);

        return back();
    }

    public function inventoryDestroy(string $slug, CustomInventory $item): RedirectResponse
    {
        $this->getGame($slug);

        if ($item->user_id !== Auth::id()) {
            abort(403);
        }

        $lotId = $item->lot_id;
        $item->delete();

        if ($lotId) {
            CustomInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function inventoryDeleteMultiple(Request $request, string $slug): RedirectResponse
    {
        $this->getGame($slug);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:custom_inventory,id'],
        ]);

        $affectedLotIds = CustomInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->pluck('lot_id')
            ->unique()
            ->filter()
            ->toArray();

        CustomInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->delete();

        foreach ($affectedLotIds as $lotId) {
            CustomInventory::renumberPositionsInLot($lotId);
        }

        return back();
    }

    public function inventoryMarkSold(Request $request, string $slug): RedirectResponse
    {
        $this->getGame($slug);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:custom_inventory,id'],
            'sold_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $items = CustomInventory::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->get();

        foreach ($items as $item) {
            $item->markAsSold($validated['sold_price'] ?? null);
        }

        return back()->with('success', count($items).' Karte(n) als verkauft markiert');
    }

    public function inventoryMoveToCollection(Request $request, string $slug): RedirectResponse
    {
        $game = $this->getGame($slug);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:custom_inventory,id'],
        ]);

        $affectedLotIds = [];

        DB::transaction(function () use ($validated, $game, &$affectedLotIds) {
            $items = CustomInventory::whereIn('id', $validated['ids'])
                ->where('user_id', Auth::id())
                ->with('printing.card')
                ->get();

            // Filter to only items from this game
            $items = $items->filter(fn ($item) => $item->printing->card->game_id === $game->id);

            $affectedLotIds = $items->pluck('lot_id')->unique()->filter()->toArray();

            foreach ($items as $item) {
                $existing = CustomCollection::where('user_id', Auth::id())
                    ->where('custom_printing_id', $item->custom_printing_id)
                    ->where('condition', $item->condition)
                    ->where('language', $item->language ?? 'DE')
                    ->first();

                if ($existing) {
                    $existing->increment('quantity');
                } else {
                    CustomCollection::create([
                        'user_id' => Auth::id(),
                        'custom_printing_id' => $item->custom_printing_id,
                        'condition' => $item->condition,
                        'language' => $item->language ?? 'DE',
                        'quantity' => 1,
                        'source_lot_id' => $item->lot_id,
                    ]);
                }

                $item->delete();
            }
        });

        foreach ($affectedLotIds as $lotId) {
            CustomInventory::renumberPositionsInLot($lotId);
        }

        return back()->with('success', 'Karten in Sammlung verschoben');
    }

    // ========== COLLECTION ==========

    public function collection(Request $request, string $slug): Response
    {
        $game = $this->getGame($slug);
        $userId = Auth::id();

        $query = CustomCollection::where('user_id', $userId)
            ->with(['printing.card'])
            ->whereHas('printing.card', fn ($q) => $q->where('game_id', $game->id));

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('printing.card', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        if ($request->filled('condition')) {
            $query->where('condition', $request->input('condition'));
        }

        $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $totalCards = CustomCollection::where('user_id', $userId)
            ->whereHas('printing.card', fn ($q) => $q->where('game_id', $game->id))
            ->sum('quantity');

        $uniqueCards = CustomCollection::where('user_id', $userId)
            ->whereHas('printing.card', fn ($q) => $q->where('game_id', $game->id))
            ->count();

        return Inertia::render('games/collection', [
            'game' => $game,
            'collection' => $collection,
            'filters' => $request->only(['search', 'condition']),
            'conditions' => $this->getConditions($game),
            'stats' => [
                'total' => $totalCards,
                'unique' => $uniqueCards,
            ],
        ]);
    }

    public function collectionUpdate(Request $request, string $slug, CustomCollection $item): RedirectResponse
    {
        $game = $this->getGame($slug);

        if ($item->user_id !== Auth::id()) {
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

    public function collectionDestroy(string $slug, CustomCollection $item): RedirectResponse
    {
        $this->getGame($slug);

        if ($item->user_id !== Auth::id()) {
            abort(403);
        }

        $item->delete();

        return back();
    }

    public function collectionDeleteMultiple(Request $request, string $slug): RedirectResponse
    {
        $this->getGame($slug);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:custom_collection,id'],
        ]);

        CustomCollection::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->delete();

        return back();
    }

    // ========== CARDS (Database) ==========

    public function cards(Request $request, string $slug): Response
    {
        $game = $this->getGame($slug);
        $userId = Auth::id();

        $query = CustomCard::where('user_id', $userId)
            ->where('game_id', $game->id)
            ->with(['printings']);

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->input('search').'%');
        }

        $cards = $query->orderBy('name')->paginate(24)->withQueryString();

        return Inertia::render('games/cards', [
            'game' => $game,
            'cards' => $cards,
            'filters' => $request->only(['search']),
            'rarities' => $this->getRarities($game),
            'foilings' => $this->getFoilings($game),
        ]);
    }
}
