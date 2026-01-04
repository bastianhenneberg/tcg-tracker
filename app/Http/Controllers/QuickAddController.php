<?php

namespace App\Http\Controllers;

use App\Models\Box;
use App\Models\Custom\CustomInventory;
use App\Models\Custom\CustomPrinting;
use App\Models\Game;
use App\Models\Lot;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Services\Fab\FabCardMatcherService;
use App\Services\Mtg\MtgCardMatcherService;
use App\Services\Op\OpCardMatcherService;
use App\Services\Riftbound\RiftboundCardMatcherService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class QuickAddController extends Controller
{
    public function __construct(
        protected FabCardMatcherService $fabCardMatcherService,
        protected MtgCardMatcherService $mtgCardMatcherService,
        protected RiftboundCardMatcherService $riftboundCardMatcherService,
        protected OpCardMatcherService $opCardMatcherService
    ) {}

    public function index(Request $request): Response
    {
        $user = Auth::user();

        $games = $this->getAvailableGames($user);
        $selectedGame = $this->resolveGame($request->input('game'), $games);

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
            $searchResults = $this->searchCards($selectedGame, $request->input('q'), 15);
        }

        // Default settings
        $defaultCondition = 'NM';
        $defaultFoiling = null;
        $defaultLanguage = 'EN';

        // Load recently added cards (last 10 from selected lot)
        $selectedLotId = $request->input('lot_id', $lots->first()?->id);
        $recentCards = $this->getRecentCards($selectedGame, $selectedLotId, 10);

        return Inertia::render('quick-add/index', [
            'games' => $games,
            'selectedGame' => $selectedGame,
            'conditions' => $this->getConditions($selectedGame),
            'foilings' => $this->getFoilings($selectedGame),
            'languages' => $this->getLanguages($selectedGame),
            'lots' => $lots,
            'boxes' => $boxes,
            'selectedLotId' => $selectedLotId,
            'recentCards' => $recentCards,
            'searchResults' => $searchResults,
            'searchQuery' => $request->input('q', ''),
            'defaultCondition' => $defaultCondition,
            'defaultFoiling' => $defaultFoiling,
            'defaultLanguage' => $defaultLanguage,
        ]);
    }

    public function confirm(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'game' => ['required', 'string'],
            'lot_id' => ['required', 'exists:lots,id'],
            'printing_id' => ['required', 'integer'],
            'condition' => ['required', 'string'],
            'foiling' => ['nullable', 'string'],
            'language' => ['nullable', 'string'],
            'is_custom' => ['boolean'],
        ]);

        $game = Game::where('slug', $validated['game'])->firstOrFail();
        $lot = Lot::findOrFail($validated['lot_id']);
        $this->authorize('view', $lot);

        $inventoryItem = $this->createInventoryItem(
            $game,
            $lot,
            $validated['printing_id'],
            $validated['condition'],
            $validated['foiling'] ?? null,
            $validated['language'] ?? 'EN',
            $validated['is_custom'] ?? false
        );

        $isCustom = $validated['is_custom'] ?? false;
        $position = $isCustom
            ? $inventoryItem->position_in_lot
            : ($inventoryItem->extra['position_in_lot'] ?? $inventoryItem->id);
        $setName = $isCustom
            ? ($inventoryItem->printing->set_name ?? 'Custom')
            : ($inventoryItem->printing->set_name ?? 'Unknown');

        return back()->with('quickAdd', [
            'success' => true,
            'confirmed' => [
                'id' => $inventoryItem->id,
                'card_name' => $inventoryItem->printing->card->name,
                'set_name' => $setName,
                'collector_number' => $inventoryItem->printing->collector_number,
                'position' => $position,
                'condition' => $inventoryItem->condition,
                'is_custom' => $isCustom,
            ],
        ]);
    }

    public function createLot(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'box_id' => ['nullable', 'exists:boxes,id'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $user = Auth::user();

        if (isset($validated['box_id'])) {
            $box = Box::findOrFail($validated['box_id']);
            $this->authorize('view', $box);
        }

        $nextNumber = Lot::where('user_id', $user->id)->max('lot_number') + 1;

        $lot = Lot::create([
            'user_id' => $user->id,
            'box_id' => $validated['box_id'] ?? null,
            'lot_number' => $nextNumber,
            'notes' => $validated['notes'] ?? null,
            'scanned_at' => now(),
        ]);

        return back()->with('quickAdd', [
            'success' => true,
            'newLot' => [
                'id' => $lot->id,
                'lot_number' => (string) $lot->lot_number,
                'box_name' => $lot->box?->name,
            ],
        ]);
    }

    // Helper methods

    private function getAvailableGames($user): Collection
    {
        $officialGames = Game::where('is_official', true)
            ->orderBy('name')
            ->get(['id', 'slug', 'name', 'is_official']);

        $customGames = Game::where('user_id', $user->id)
            ->where('is_official', false)
            ->orderBy('name')
            ->get(['id', 'slug', 'name', 'is_official']);

        return $officialGames->concat($customGames);
    }

    private function resolveGame(?string $gameSlug, Collection $games): Game
    {
        if ($gameSlug) {
            $game = $games->firstWhere('slug', $gameSlug);
            if ($game) {
                return $game;
            }
        }

        return $games->firstWhere('slug', 'fab') ?? $games->first();
    }

    private function getConditions(Game $game): array
    {
        if ($game->is_official) {
            return UnifiedInventory::CONDITIONS;
        }

        return $game->getConditions();
    }

    private function getFoilings(Game $game): array
    {
        if ($game->is_official) {
            return UnifiedPrinting::GAME_FINISHES[$game->slug] ?? UnifiedPrinting::FINISHES;
        }

        return $game->getFoilings();
    }

    private function getLanguages(Game $game): array
    {
        if ($game->is_official) {
            return UnifiedInventory::LANGUAGES;
        }

        return $game->getLanguages();
    }

    private function searchCards(Game $game, string $query, int $limit): array
    {
        return match ($game->slug) {
            'fab' => $this->fabCardMatcherService->search($query, $limit)->values()->toArray(),
            'mtg' => $this->mtgCardMatcherService->search($query, $limit)->values()->toArray(),
            'onepiece' => $this->opCardMatcherService->search($query, $limit)->values()->toArray(),
            'riftbound' => $this->riftboundCardMatcherService->search($query, $limit)->values()->toArray(),
            default => $this->searchCustomGameCards($game, $query, $limit),
        };
    }

    private function searchCustomGameCards(Game $game, string $query, int $limit): array
    {
        return CustomPrinting::with('card')
            ->whereHas('card', fn ($q) => $q->where('game_id', $game->id))
            ->where(function ($q) use ($query) {
                $q->whereHas('card', fn ($c) => $c->where('name', 'like', "%{$query}%"))
                    ->orWhere('collector_number', 'like', "%{$query}%");
            })
            ->limit($limit)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'card_name' => $p->card->name,
                'set_name' => $p->set_name ?? 'Custom',
                'collector_number' => $p->collector_number ?? '-',
                'rarity' => $p->rarity,
                'rarity_label' => $p->rarity,
                'foiling' => $p->foiling,
                'foiling_label' => $p->foiling,
                'image_url' => $p->image_url,
                'is_custom' => true,
            ])
            ->toArray();
    }

    private function getRecentCards(Game $game, ?int $lotId, int $limit): array
    {
        if (! $lotId) {
            return [];
        }

        // For official games, use UnifiedInventory
        if ($game->is_official) {
            return UnifiedInventory::where('lot_id', $lotId)
                ->with('printing.card')
                ->orderByDesc('created_at')
                ->limit($limit)
                ->get()
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'card_name' => $item->printing->card->name,
                    'set_name' => $item->printing->set_name ?? 'Unknown',
                    'collector_number' => $item->printing->collector_number,
                    'position' => $item->extra['position_in_lot'] ?? $item->id,
                    'condition' => $item->condition,
                    'foiling' => $item->printing->finish,
                    'is_custom' => false,
                ])
                ->toArray();
        }

        // For custom games, use CustomInventory
        return CustomInventory::where('lot_id', $lotId)
            ->with('printing.card')
            ->orderByDesc('position_in_lot')
            ->limit($limit)
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'card_name' => $item->printing->card->name,
                'set_name' => $item->printing->set_name ?? 'Custom',
                'collector_number' => $item->printing->collector_number,
                'position' => $item->position_in_lot,
                'condition' => $item->condition,
                'foiling' => $item->printing->foiling,
                'is_custom' => true,
            ])
            ->toArray();
    }

    private function createInventoryItem(
        Game $game,
        Lot $lot,
        int $printingId,
        string $condition,
        ?string $foiling,
        ?string $language,
        bool $isCustom
    ) {
        // For custom games, use CustomInventory
        if ($isCustom || ! $game->is_official) {
            $position = CustomInventory::where('lot_id', $lot->id)->max('position_in_lot') ?? 0;

            return CustomInventory::create([
                'user_id' => Auth::id(),
                'lot_id' => $lot->id,
                'custom_printing_id' => $printingId,
                'condition' => $condition,
                'language' => $language ?? 'EN',
                'position_in_lot' => $position + 1,
            ]);
        }

        // For official games, use UnifiedInventory
        $position = UnifiedInventory::where('lot_id', $lot->id)->max('extra->position_in_lot') ?? 0;

        return UnifiedInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $lot->id,
            'printing_id' => $printingId,
            'condition' => $condition,
            'language' => $language ?? 'EN',
            'quantity' => 1,
            'in_collection' => false,
            'extra' => [
                'position_in_lot' => $position + 1,
            ],
        ]);
    }
}
