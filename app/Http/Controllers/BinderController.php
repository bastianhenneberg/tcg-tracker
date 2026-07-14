<?php

namespace App\Http\Controllers;

use App\Models\Binder;
use App\Models\BinderPage;
use App\Models\BinderPageSlot;
use App\Models\Game;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\UnifiedSet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BinderController extends Controller
{
    /**
     * Map game slugs (games table) to the unified_* game column value.
     */
    private const GAME_SLUG_MAP = [
        'fab' => 'fab',
        'magic-the-gathering' => 'mtg',
        'onepiece' => 'onepiece',
        'riftbound' => 'riftbound',
    ];

    /**
     * Reverse map: unified game value to games table slug.
     */
    private const UNIFIED_TO_GAME_SLUG = [
        'fab' => 'fab',
        'mtg' => 'magic-the-gathering',
        'onepiece' => 'onepiece',
        'riftbound' => 'riftbound',
    ];

    public function index(Request $request): Response
    {
        $query = Binder::where('user_id', Auth::id())
            ->withCount('pages')
            ->withCount('inventoryItems');

        // Search filter
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortField = $request->input('sort', 'name');
        $sortDirection = $request->input('direction', 'asc');
        $allowedSorts = ['name', 'created_at', 'pages_count', 'inventory_items_count'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection === 'desc' ? 'desc' : 'asc');
        }

        $binders = $query->paginate($request->input('per_page', 25))->withQueryString();

        return Inertia::render('collection/binders/index', [
            'binders' => $binders,
            'games' => $this->officialGames(),
            'filters' => [
                'search' => $request->input('search'),
                'sort' => $sortField,
                'direction' => $sortDirection,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'color' => ['nullable', 'string', 'max:50'],
            'unified_set_id' => ['nullable', 'integer', 'exists:unified_sets,id'],
        ]);

        Binder::create([
            'user_id' => Auth::id(),
            ...$validated,
        ]);

        return back();
    }

    public function show(Request $request, Binder $binder): Response
    {
        $this->authorize('view', $binder);

        $binder->load([
            'set',
            'pages' => fn ($q) => $q->withCount(['inventoryItems', 'templateSlots'])->orderBy('page_number'),
        ]);

        // Get current page number from request (default to 1)
        $currentPageNumber = (int) $request->input('page', 1);

        // Find the current page or null
        $currentPage = $binder->pages->firstWhere('page_number', $currentPageNumber);

        // Load items for current page if it exists (grouped by slot, max 4 per slot)
        $slots = [];
        if ($currentPage) {
            $items = $currentPage->inventoryItems()
                ->with(['printing.card', 'printing.set', 'deckAssignments.deck'])
                ->orderBy('position_in_slot')
                ->get()
                ->groupBy('binder_slot');

            for ($i = 1; $i <= BinderPage::SLOTS_PER_PAGE; $i++) {
                $slotItems = $items->get($i, collect())
                    ->take(4)
                    ->values()
                    ->map(function ($item) {
                        $item->deck_names = $item->deckAssignments
                            ->map(fn ($a) => $a->deck?->name)
                            ->filter()
                            ->unique()
                            ->values()
                            ->all();
                        $item->is_in_deck = count($item->deck_names) > 0;

                        return $item;
                    })
                    ->all();
                $slots[$i] = $slotItems;
            }
        }

        return Inertia::render('collection/binders/show', [
            'binder' => $binder,
            'currentPage' => $currentPage,
            'currentPageNumber' => $currentPageNumber,
            'slots' => $slots,
            'templateSlots' => $currentPage ? $this->templateSlotsForPage($currentPage) : [],
            'games' => $this->officialGames(),
            'totalPages' => $binder->pages->max('page_number') ?? 0,
        ]);
    }

    /**
     * Build the 1..9 set-template slots for a page, flagged with the user's ownership.
     *
     * @return array<int, array{slot: int, printing: array<string, mixed>, owned: bool, quantity: int}|null>
     */
    private function templateSlotsForPage(BinderPage $page): array
    {
        $slots = $page->templateSlots()->with('printing.card:id,name')->get()->keyBy('slot');

        if ($slots->isEmpty()) {
            return [];
        }

        $cardIds = $slots->pluck('printing.card_id')->filter()->unique()->all();

        $ownedQuantities = UnifiedInventory::where('user_id', Auth::id())
            ->where('in_collection', true)
            ->whereHas('printing', fn ($q) => $q->whereIn('card_id', $cardIds))
            ->with('printing:id,card_id')
            ->get()
            ->groupBy(fn ($inventory) => $inventory->printing->card_id)
            ->map(fn ($group) => (int) $group->sum('quantity'));

        $result = [];
        for ($i = 1; $i <= BinderPage::SLOTS_PER_PAGE; $i++) {
            $templateSlot = $slots->get($i);

            if (! $templateSlot || ! $templateSlot->printing) {
                $result[$i] = null;

                continue;
            }

            $printing = $templateSlot->printing;
            $quantity = $ownedQuantities[$printing->card_id] ?? 0;

            $result[$i] = [
                'slot' => $i,
                'printing' => [
                    'id' => $printing->id,
                    'collector_number' => $printing->collector_number,
                    'name' => $printing->card?->name,
                    'rarity_label' => $printing->rarity_label,
                    'image_url' => $printing->image_url_small ?: $printing->image_url,
                ],
                'owned' => $quantity > 0,
                'quantity' => $quantity,
            ];
        }

        return $result;
    }

    /**
     * Official games with their unified game key, for the set-template picker.
     *
     * @return array<int, array{slug: string, name: string, unified: string}>
     */
    private function officialGames(): array
    {
        return Game::where('is_official', true)
            ->orderBy('name')
            ->get(['slug', 'name'])
            ->map(fn (Game $game) => [
                'slug' => $game->slug,
                'name' => $game->name,
                'unified' => self::GAME_SLUG_MAP[$game->slug] ?? $game->slug,
            ])
            ->all();
    }

    /**
     * List the sets of a game for the set-template picker (JSON, used by the dialog).
     */
    public function availableSets(Request $request): JsonResponse
    {
        $slug = (string) $request->input('game', '');
        $unifiedGame = self::GAME_SLUG_MAP[$slug] ?? $slug;

        $sets = UnifiedSet::where('game', $unifiedGame)
            ->withCount('printings')
            ->orderByDesc('released_at')
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        return response()->json(['sets' => $sets]);
    }

    /**
     * Generate set-template pages for a binder: every card of the set laid out in
     * 3x3 pockets (one pocket per collector number), ordered by number or rarity.
     */
    public function generateFromSet(Request $request, Binder $binder): RedirectResponse
    {
        $this->authorize('update', $binder);

        $validated = $request->validate([
            'unified_set_id' => ['required', 'integer', 'exists:unified_sets,id'],
            'sort' => ['nullable', 'in:number,rarity_asc,rarity_desc'],
        ]);

        $set = UnifiedSet::findOrFail($validated['unified_set_id']);
        $sort = $validated['sort'] ?? 'number';

        // One pocket per collector number (base card wins over foil/variant printings).
        $printings = UnifiedPrinting::where('set_id', $set->id)
            ->with('card:id,name')
            ->orderByRaw('is_variant asc, is_promo asc, id asc')
            ->get()
            ->unique('collector_number')
            ->values();

        $rarityRank = $this->rarityRankForGame($set->game);

        $sorted = $printings->sort(function (UnifiedPrinting $a, UnifiedPrinting $b) use ($rarityRank, $sort): int {
            if ($sort !== 'number') {
                $rankA = $rarityRank[$a->rarity] ?? 999;
                $rankB = $rarityRank[$b->rarity] ?? 999;
                if ($rankA !== $rankB) {
                    return $sort === 'rarity_desc' ? $rankB <=> $rankA : $rankA <=> $rankB;
                }
            }

            return strnatcasecmp((string) $a->collector_number, (string) $b->collector_number);
        })->values();

        DB::transaction(function () use ($binder, $set, $sorted) {
            // Regenerate: drop existing template pages (freeform inventory pages stay).
            $binder->pages()->whereHas('templateSlots')->get()->each->delete();
            $binder->update(['unified_set_id' => $set->id]);

            $pageNumber = BinderPage::nextPageNumber($binder->id);

            foreach ($sorted->chunk(BinderPage::SLOTS_PER_PAGE) as $chunk) {
                $page = BinderPage::create([
                    'user_id' => $binder->user_id,
                    'binder_id' => $binder->id,
                    'page_number' => $pageNumber++,
                ]);

                $slot = 1;
                foreach ($chunk->values() as $printing) {
                    BinderPageSlot::create([
                        'binder_page_id' => $page->id,
                        'slot' => $slot++,
                        'printing_id' => $printing->id,
                    ]);
                }
            }
        });

        return redirect()
            ->route('binders.show', ['binder' => $binder->id, 'page' => 1])
            ->with('success', "{$sorted->count()} Karten aus {$set->name} als Vorlage generiert.");
    }

    /**
     * Rarity key => rank map for a unified game (from GameAttribute sort_order).
     *
     * @return array<string, int>
     */
    private function rarityRankForGame(string $unifiedGame): array
    {
        $slug = self::UNIFIED_TO_GAME_SLUG[$unifiedGame] ?? $unifiedGame;
        $game = Game::where('slug', $slug)->first();

        if (! $game) {
            return [];
        }

        return $game->rarities()->pluck('sort_order', 'key')->all();
    }

    public function update(Request $request, Binder $binder): RedirectResponse
    {
        $this->authorize('update', $binder);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'color' => ['nullable', 'string', 'max:50'],
            'unified_set_id' => ['nullable', 'integer', 'exists:unified_sets,id'],
        ]);

        $binder->update($validated);

        return back();
    }

    public function destroy(Binder $binder): RedirectResponse
    {
        $this->authorize('delete', $binder);

        $binder->delete();

        return redirect()->route('binders.index');
    }

    public function addPage(Binder $binder): RedirectResponse
    {
        $this->authorize('update', $binder);

        BinderPage::create([
            'user_id' => Auth::id(),
            'binder_id' => $binder->id,
            'page_number' => BinderPage::nextPageNumber($binder->id),
        ]);

        return back();
    }
}
