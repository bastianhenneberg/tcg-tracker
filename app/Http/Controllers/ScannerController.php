<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessInventoryAction;
use App\Models\Box;
use App\Models\Custom\CustomInventory;
use App\Models\Custom\CustomPrinting;
use App\Models\Game;
use App\Models\Lot;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Services\Fab\FabCardMatcherService;
use App\Services\Mtg\MtgCardMatcherService;
use App\Services\OllamaService;
use App\Services\Op\OpCardMatcherService;
use App\Services\Riftbound\RiftboundCardMatcherService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ScannerController extends Controller
{
    public function __construct(
        protected OllamaService $ollamaService,
        protected FabCardMatcherService $fabCardMatcherService,
        protected MtgCardMatcherService $mtgCardMatcherService,
        protected RiftboundCardMatcherService $riftboundCardMatcherService,
        protected OpCardMatcherService $opCardMatcherService
    ) {}

    public function index(Request $request): Response
    {
        $user = Auth::user();

        // Get all available games (official + user's custom games)
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

        $ollamaStatus = $this->ollamaService->getStatus();

        // Search results
        $searchResults = [];
        if ($request->filled('q') && strlen($request->input('q')) >= 2) {
            $searchResults = $this->searchCards($selectedGame, $request->input('q'), 20);
        }

        // User scanner settings (per game)
        $settingsKey = $this->getScannerSettingsKey($selectedGame);
        $scannerSettings = $user->$settingsKey ?? [
            'bulkMode' => [
                'enabled' => false,
                'interval' => 3,
                'defaultCondition' => 'NM',
                'defaultFoiling' => null,
                'defaultLanguage' => 'EN',
            ],
        ];

        // Ensure defaultLanguage exists for backwards compatibility
        if (! isset($scannerSettings['bulkMode']['defaultLanguage'])) {
            $scannerSettings['bulkMode']['defaultLanguage'] = 'EN';
        }

        // Load inventory items for the selected lot
        $selectedLotId = $request->input('lot_id', $lots->first()?->id);
        $lotInventory = $this->getLotInventory($selectedGame, $selectedLotId);

        return Inertia::render('scanner/index', [
            'games' => $games,
            'selectedGame' => $selectedGame,
            'lots' => $lots,
            'boxes' => $boxes,
            'ollamaStatus' => $ollamaStatus,
            'conditions' => $this->getConditions($selectedGame),
            'foilings' => $this->getFoilings($selectedGame),
            'languages' => $this->getLanguages($selectedGame),
            'searchResults' => $searchResults,
            'searchQuery' => $request->input('q', ''),
            'scannerSettings' => $scannerSettings,
            'lotInventory' => $lotInventory,
            'selectedLotId' => $selectedLotId,
        ]);
    }

    public function recognize(Request $request): RedirectResponse
    {
        $request->validate([
            'image' => ['required', 'string'],
            'game' => ['required', 'string'],
        ]);

        $game = Game::where('slug', $request->input('game'))->firstOrFail();
        $base64Image = $request->input('image');

        if (str_contains($base64Image, ',')) {
            $base64Image = explode(',', $base64Image)[1];
        }

        $recognition = $this->ollamaService->recognizeCard($base64Image);

        if (! $recognition['success']) {
            return back()->with('scanner', [
                'success' => false,
                'error' => $recognition['error'] ?? 'Recognition failed',
            ]);
        }

        $matchResult = $this->findMatch($game, $recognition['data']);

        $matchData = null;
        if ($matchResult['match']) {
            $matchData = $this->formatMatchData($game, $matchResult['match'], $matchResult['is_custom']);
        }

        return back()->with('scanner', [
            'success' => true,
            'recognition' => $recognition['data'],
            'match' => $matchData,
            'confidence' => $matchResult['confidence'],
            'alternatives' => $matchResult['alternatives']->map(fn ($p) => $this->formatMatchData($game, $p, false))->values()->toArray(),
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

        $lotCount = $this->getLotCardCount($game, $lot->id);

        // Get position from extra for UnifiedInventory, direct property for CustomInventory
        $position = $inventoryItem->extra['position_in_lot'] ?? $inventoryItem->position_in_lot ?? $inventoryItem->id;

        return back()->with('scanner', [
            'success' => true,
            'confirmed' => [
                'id' => $inventoryItem->id,
                'card_name' => $inventoryItem->printing->card->name,
                'position' => $position,
                'condition' => $inventoryItem->condition,
                'is_custom' => $validated['is_custom'] ?? false,
            ],
            'lot_count' => $lotCount,
        ]);
    }

    public function confirmBulk(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'game' => ['required', 'string'],
            'lot_id' => ['required', 'exists:lots,id'],
            'cards' => ['required', 'array', 'min:1'],
            'cards.*.printing_id' => ['required', 'integer'],
            'cards.*.condition' => ['required', 'string'],
            'cards.*.foiling' => ['nullable', 'string'],
            'cards.*.language' => ['nullable', 'string'],
            'cards.*.is_custom' => ['boolean'],
        ]);

        $game = Game::where('slug', $validated['game'])->firstOrFail();
        $lot = Lot::findOrFail($validated['lot_id']);
        $this->authorize('view', $lot);

        // For many cards, use job queue
        if (count($validated['cards']) > 3) {
            ProcessInventoryAction::dispatch([
                'action' => 'bulk_add',
                'game_slug' => $game->slug,
                'lot_id' => $lot->id,
                'user_id' => Auth::id(),
                'cards' => $validated['cards'],
            ]);

            return back()->with('scanner', [
                'success' => true,
                'queued' => true,
                'count' => count($validated['cards']),
            ]);
        }

        // For few cards, process directly
        $confirmedCards = [];
        foreach ($validated['cards'] as $cardData) {
            $inventoryItem = $this->createInventoryItem(
                $game,
                $lot,
                $cardData['printing_id'],
                $cardData['condition'],
                $cardData['foiling'] ?? null,
                $cardData['language'] ?? 'EN',
                $cardData['is_custom'] ?? false
            );

            $confirmedCards[] = [
                'id' => $inventoryItem->id,
                'card_name' => $inventoryItem->printing->card->name,
                'position' => $inventoryItem->extra['position_in_lot'] ?? $inventoryItem->position_in_lot ?? $inventoryItem->id,
                'condition' => $inventoryItem->condition,
            ];
        }

        return back()->with('scanner', [
            'success' => true,
            'confirmed_cards' => $confirmedCards,
            'lot_count' => $this->getLotCardCount($game, $lot->id),
        ]);
    }

    public function createLot(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'box_id' => ['nullable', 'exists:boxes,id'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $user = Auth::user();

        // Check box ownership if provided
        if (isset($validated['box_id'])) {
            $box = Box::findOrFail($validated['box_id']);
            $this->authorize('view', $box);
        }

        // Get next lot number for user
        $nextNumber = Lot::where('user_id', $user->id)->max('lot_number') + 1;

        $lot = Lot::create([
            'user_id' => $user->id,
            'box_id' => $validated['box_id'] ?? null,
            'lot_number' => $nextNumber,
            'notes' => $validated['notes'] ?? null,
            'scanned_at' => now(),
        ]);

        return back()->with('scanner', [
            'success' => true,
            'newLot' => [
                'id' => $lot->id,
                'lot_number' => (string) $lot->lot_number,
                'box_name' => $lot->box?->name,
            ],
        ]);
    }

    public function saveSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'game' => ['required', 'string'],
            'bulkMode' => ['nullable', 'array'],
            'bulkMode.enabled' => ['nullable', 'boolean'],
            'bulkMode.interval' => ['nullable', 'integer', 'min:1', 'max:30'],
            'bulkMode.defaultCondition' => ['nullable', 'string'],
            'bulkMode.defaultFoiling' => ['nullable', 'string'],
            'bulkMode.defaultLanguage' => ['nullable', 'string'],
        ]);

        $game = Game::where('slug', $validated['game'])->firstOrFail();
        $user = Auth::user();
        $settingsKey = $this->getScannerSettingsKey($game);

        $currentSettings = $user->$settingsKey ?? [];
        $user->$settingsKey = array_merge($currentSettings, $validated);
        $user->save();

        return back();
    }

    // Helper methods

    private function getAvailableGames($user): Collection
    {
        // Official games
        $officialGames = Game::where('is_official', true)
            ->orderBy('name')
            ->get(['id', 'slug', 'name', 'is_official']);

        // User's custom games
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

        // Default to FAB
        return $games->firstWhere('slug', 'fab') ?? $games->first();
    }

    private function getScannerSettingsKey(Game $game): string
    {
        return match ($game->slug) {
            'fab' => 'scanner_settings',
            'mtg' => 'mtg_scanner_settings',
            'op' => 'op_scanner_settings',
            'riftbound' => 'riftbound_scanner_settings',
            default => 'scanner_settings',
        };
    }

    private function getConditions(Game $game): array
    {
        // For official games, use unified conditions
        if ($game->is_official) {
            return UnifiedInventory::CONDITIONS;
        }

        // For custom games, use game attributes
        return $game->getConditions();
    }

    private function getFoilings(Game $game): array
    {
        // For official games with game-specific finishes
        if ($game->is_official && isset(UnifiedPrinting::GAME_FINISHES[$game->slug])) {
            return UnifiedPrinting::GAME_FINISHES[$game->slug];
        }

        // For official games without specific finishes, use generic
        if ($game->is_official) {
            return UnifiedPrinting::FINISHES;
        }

        // For custom games, use game attributes
        return $game->getFoilings();
    }

    private function getLanguages(Game $game): array
    {
        // For official games, use unified languages
        if ($game->is_official) {
            return UnifiedInventory::LANGUAGES;
        }

        // For custom games, use game attributes
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

    private function findMatch(Game $game, array $recognitionData): array
    {
        return match ($game->slug) {
            'fab' => $this->fabCardMatcherService->findMatch($recognitionData),
            'mtg' => $this->mtgCardMatcherService->findMatch($recognitionData),
            'onepiece' => $this->opCardMatcherService->findMatch($recognitionData),
            'riftbound' => $this->riftboundCardMatcherService->findMatch($recognitionData),
            default => $this->findMatchInCustomGame($game, $recognitionData),
        };
    }

    private function findMatchInCustomGame(Game $game, array $recognitionData): array
    {
        $cardName = $recognitionData['card_name'] ?? null;
        $collectorNumber = $recognitionData['collector_number'] ?? null;
        $setCode = $recognitionData['set_code'] ?? null;

        $userId = Auth::id();
        if (! $userId) {
            return [
                'match' => null,
                'confidence' => 'none',
                'alternatives' => collect(),
                'is_custom' => true,
            ];
        }

        $query = CustomPrinting::query()
            ->with(['card'])
            ->where('user_id', $userId)
            ->whereHas('card', fn ($q) => $q->where('game_id', $game->id));

        // Try exact match by collector number and set
        if ($collectorNumber && $setCode) {
            $exact = (clone $query)
                ->where('collector_number', $collectorNumber)
                ->where('set_name', $setCode)
                ->first();
            if ($exact) {
                return [
                    'match' => $exact,
                    'confidence' => 'high',
                    'alternatives' => collect(),
                    'is_custom' => true,
                ];
            }
        }

        // Try by card name
        if ($cardName) {
            $matches = (clone $query)
                ->whereHas('card', fn ($q) => $q->where('name', 'like', "%{$cardName}%"))
                ->limit(10)
                ->get();

            if ($matches->isNotEmpty()) {
                return [
                    'match' => $matches->first(),
                    'confidence' => $matches->count() === 1 ? 'medium' : 'low',
                    'alternatives' => $matches->skip(1)->take(5),
                    'is_custom' => true,
                ];
            }
        }

        return [
            'match' => null,
            'confidence' => 'none',
            'alternatives' => collect(),
            'is_custom' => true,
        ];
    }

    private function formatMatchData(Game $game, $printing, bool $isCustom): array
    {
        if ($isCustom) {
            return [
                'id' => $printing->id,
                'card_name' => $printing->card->name,
                'set_name' => $printing->set_name ?? 'Custom',
                'collector_number' => $printing->collector_number ?? '-',
                'rarity' => $printing->rarity,
                'rarity_label' => $printing->rarity,
                'foiling' => $printing->foiling,
                'foiling_label' => $printing->foiling,
                'image_url' => $printing->image_url,
                'is_custom' => true,
            ];
        }

        return [
            'id' => $printing->id,
            'card_name' => $printing->card->name,
            'set_name' => $printing->set->name ?? $printing->set->external_id ?? 'Unknown',
            'collector_number' => $printing->collector_number,
            'rarity' => $printing->rarity,
            'rarity_label' => $printing->rarity_label ?? $printing->rarity,
            'foiling' => $printing->foiling ?? null,
            'foiling_label' => $printing->foiling_label ?? $printing->foiling ?? null,
            'image_url' => $printing->image_url,
            'is_custom' => false,
        ];
    }

    private function getLotInventory(Game $game, ?int $lotId): array
    {
        if (! $lotId) {
            return [];
        }

        // For official games, use UnifiedInventory
        if ($game->is_official) {
            return UnifiedInventory::where('lot_id', $lotId)
                ->with('printing.card')
                ->orderByDesc('created_at')
                ->limit(50)
                ->get()
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'card_name' => $item->printing->card->name,
                    'position' => $item->extra['position_in_lot'] ?? $item->id,
                    'condition' => $item->condition,
                    'is_custom' => false,
                ])
                ->toArray();
        }

        // For custom games, use CustomInventory
        return CustomInventory::where('lot_id', $lotId)
            ->with('printing.card')
            ->orderByDesc('position_in_lot')
            ->limit(50)
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'card_name' => $item->printing->card->name,
                'position' => $item->position_in_lot,
                'condition' => $item->condition,
                'is_custom' => true,
            ])
            ->toArray();
    }

    private function getLotCardCount(Game $game, int $lotId): int
    {
        if ($game->is_official) {
            return UnifiedInventory::where('lot_id', $lotId)->count();
        }

        return CustomInventory::where('lot_id', $lotId)->count();
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
        // For custom games or custom cards, use CustomInventory
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
