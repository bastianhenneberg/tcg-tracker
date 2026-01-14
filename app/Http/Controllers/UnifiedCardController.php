<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use App\Models\UnifiedSet;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnifiedCardController extends Controller
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

    /**
     * Game-specific filters configuration.
     */
    private const GAME_FILTERS = [
        'fab' => [
            'pitch' => [1 => 'Red (1)', 2 => 'Yellow (2)', 3 => 'Blue (3)'],
            'formats' => [
                'blitz' => 'Blitz',
                'cc' => 'Classic Constructed',
                'commoner' => 'Commoner',
                'll' => 'Living Legend',
            ],
        ],
        'mtg' => [
            'colors' => ['W' => 'White', 'U' => 'Blue', 'B' => 'Black', 'R' => 'Red', 'G' => 'Green'],
            'formats' => [
                'standard' => 'Standard',
                'modern' => 'Modern',
                'legacy' => 'Legacy',
                'vintage' => 'Vintage',
                'commander' => 'Commander',
                'pioneer' => 'Pioneer',
                'pauper' => 'Pauper',
            ],
        ],
        'onepiece' => [
            'colors' => [
                'Red' => 'Red',
                'Green' => 'Green',
                'Blue' => 'Blue',
                'Purple' => 'Purple',
                'Black' => 'Black',
                'Yellow' => 'Yellow',
            ],
            'card_types' => [
                'Leader' => 'Leader',
                'Character' => 'Character',
                'Event' => 'Event',
                'Stage' => 'Stage',
            ],
        ],
        'riftbound' => [
            'domains' => [
                'Fury' => 'Fury',
                'Calm' => 'Calm',
                'Mind' => 'Mind',
                'Body' => 'Body',
                'Chaos' => 'Chaos',
                'Order' => 'Order',
            ],
        ],
    ];

    /**
     * Get game and verify it exists.
     */
    private function getGame(string $slug): Game
    {
        return Game::where('slug', $slug)
            ->where('is_official', true)
            ->firstOrFail();
    }

    /**
     * Get the unified table game identifier from the game slug.
     */
    private function getUnifiedGameSlug(string $slug): string
    {
        return self::GAME_SLUG_MAP[$slug] ?? $slug;
    }

    /**
     * Get conditions (from game attributes or defaults).
     */
    private function getConditions(Game $game): array
    {
        $conditions = $game->getConditions();

        return ! empty($conditions) ? $conditions : self::DEFAULT_CONDITIONS;
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

    /**
     * Get game-specific filter options.
     */
    private function getGameFilters(string $unifiedSlug): array
    {
        return self::GAME_FILTERS[$unifiedSlug] ?? [];
    }

    // ========== CARDS ==========

    public function index(Request $request, string $slug): Response
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);

        $query = UnifiedCard::query()
            ->where('game', $unifiedSlug)
            ->with(['printings' => fn ($q) => $q->limit(1)])
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('name_normalized', 'like', '%'.UnifiedCard::normalize($search).'%')
                        ->orWhereHas('printings', fn ($p) => $p->where('collector_number', 'like', "%{$search}%"));
                });
            })
            ->when($request->input('type'), function (Builder $query, string $type) {
                $query->whereJsonContains('types', $type);
            })
            ->when($request->input('color'), function (Builder $query, string $color) {
                $query->whereJsonContains('colors', $color);
            })
            ->when($request->input('format'), function (Builder $query, string $format) {
                $query->whereRaw("json_extract(legalities, '$.{$format}') = 'legal'");
            });

        // Game-specific filters
        if ($unifiedSlug === 'fab' && $request->filled('pitch')) {
            $query->whereRaw("json_extract(game_specific, '$.pitch') = ?", [$request->input('pitch')]);
        }

        $cards = $query->orderBy('name')->paginate(24)->withQueryString();

        // Get unique types for filter dropdown
        $types = UnifiedCard::where('game', $unifiedSlug)
            ->selectRaw('DISTINCT json_each.value as type')
            ->crossJoin(\DB::raw('json_each(types)'))
            ->pluck('type')
            ->sort()
            ->values();

        return Inertia::render('cards/index', [
            'game' => $game,
            'cards' => $cards,
            'filters' => $request->only(['search', 'type', 'color', 'format', 'pitch']),
            'filterOptions' => $this->getGameFilters($unifiedSlug),
            'types' => $types,
        ]);
    }

    public function show(string $slug, int $cardId): Response
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);

        $card = UnifiedCard::where('game', $unifiedSlug)
            ->with(['printings' => fn ($q) => $q->with('set')->orderBy('collector_number')])
            ->findOrFail($cardId);

        return Inertia::render('cards/show', [
            'game' => $game,
            'card' => $card,
            'rarities' => $this->getRarities($game),
            'foilings' => $this->getFoilings($game),
        ]);
    }

    // ========== PRINTINGS ==========

    public function printings(Request $request, string $slug): Response
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);

        $query = UnifiedPrinting::query()
            ->with(['card', 'set'])
            ->whereHas('card', fn ($q) => $q->where('game', $unifiedSlug))
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('card', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                        ->orWhere('collector_number', 'like', "%{$search}%");
                });
            })
            ->when($request->input('set'), function (Builder $query, int $setId) {
                $query->where('set_id', $setId);
            })
            ->when($request->input('rarity'), function (Builder $query, string $rarity) {
                $query->where('rarity', $rarity);
            })
            ->when($request->input('finish'), function (Builder $query, string $finish) {
                $query->where('finish', $finish);
            })
            ->orderBy('collector_number');

        $printings = $query->paginate(24)->withQueryString();

        $sets = UnifiedSet::where('game', $unifiedSlug)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('printings/index', [
            'game' => $game,
            'printings' => $printings,
            'sets' => $sets,
            'filters' => $request->only(['search', 'set', 'rarity', 'finish']),
            'rarities' => $this->getRarities($game),
            'foilings' => $this->getFoilings($game),
        ]);
    }

    public function printing(string $slug, int $printingId): Response
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);

        $printing = UnifiedPrinting::with(['card', 'set'])
            ->whereHas('card', fn ($q) => $q->where('game', $unifiedSlug))
            ->findOrFail($printingId);

        $allPrintings = UnifiedPrinting::where('card_id', $printing->card_id)
            ->with('set')
            ->orderBy('collector_number')
            ->get();

        return Inertia::render('printings/show', [
            'game' => $game,
            'printing' => $printing,
            'allPrintings' => $allPrintings,
            'rarities' => $this->getRarities($game),
            'foilings' => $this->getFoilings($game),
        ]);
    }

    // ========== SETS ==========

    public function sets(Request $request, string $slug): Response
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);

        $query = UnifiedSet::query()
            ->where('game', $unifiedSlug)
            ->withCount('printings')
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->when($request->input('type'), function (Builder $query, string $type) {
                $query->where('set_type', $type);
            })
            ->orderByDesc('released_at');

        $sets = $query->paginate(24)->withQueryString();

        return Inertia::render('sets/index', [
            'game' => $game,
            'sets' => $sets,
            'filters' => $request->only(['search', 'type']),
        ]);
    }

    public function set(string $slug, int $setId): Response
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);

        $set = UnifiedSet::where('game', $unifiedSlug)
            ->withCount('printings')
            ->findOrFail($setId);

        $printings = UnifiedPrinting::where('set_id', $setId)
            ->with('card')
            ->orderBy('collector_number')
            ->paginate(24);

        return Inertia::render('sets/show', [
            'game' => $game,
            'set' => $set,
            'printings' => $printings,
            'rarities' => $this->getRarities($game),
        ]);
    }
}
