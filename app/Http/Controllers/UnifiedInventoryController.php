<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\Lot;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Services\Fab\CardmarketLookupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    private function getLanguages(): array
    {
        return [
            'EN' => 'English',
            'DE' => 'German',
            'FR' => 'French',
            'ES' => 'Spanish',
            'IT' => 'Italian',
            'PT' => 'Portuguese',
            'JP' => 'Japanese',
            'KO' => 'Korean',
            'ZH' => 'Chinese',
            'RU' => 'Russian',
        ];
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

        // Load available printings (different foilings) for each card+set combination
        $printingKeys = $inventory->getCollection()
            ->map(fn ($item) => $item->printing?->card_id.'|'.$item->printing?->set_code.'|'.preg_replace('/^[A-Z]+/', '', $item->printing?->collector_number ?? ''))
            ->unique()
            ->filter();

        $allPrintings = UnifiedPrinting::whereIn('card_id', $inventory->getCollection()->pluck('printing.card_id')->unique()->filter())
            ->get(['id', 'card_id', 'set_code', 'finish', 'finish_label', 'collector_number']);

        // Group by card_id + set_code + number (without prefix)
        $availablePrintings = $allPrintings->groupBy(function ($p) {
            $numberOnly = preg_replace('/^[A-Z]+/', '', $p->collector_number ?? '');

            return $p->card_id.'|'.$p->set_code.'|'.$numberOnly;
        });

        // Attach available printings to each inventory item
        $inventory->getCollection()->transform(function ($item) use ($availablePrintings) {
            $numberOnly = preg_replace('/^[A-Z]+/', '', $item->printing?->collector_number ?? '');
            $key = $item->printing?->card_id.'|'.$item->printing?->set_code.'|'.$numberOnly;
            $item->available_printings = $availablePrintings->get($key, collect())->values();

            return $item;
        });

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
            'languages' => $this->getLanguages(),
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
        $languages = $this->getLanguages();

        $validated = $request->validate([
            'condition' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys($conditions))],
            'language' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys($languages))],
            'price' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
            'lot_id' => ['nullable', 'exists:lots,id'],
            'printing_id' => ['sometimes', 'required', 'exists:unified_printings,id'],
        ]);

        // Map price to purchase_price
        if (array_key_exists('price', $validated)) {
            $validated['purchase_price'] = $validated['price'];
            unset($validated['price']);
        }

        // Verify lot belongs to user if provided
        if (isset($validated['lot_id']) && $validated['lot_id']) {
            $lot = Lot::find($validated['lot_id']);
            if (! $lot || $lot->user_id !== Auth::id()) {
                abort(403);
            }
        }

        // Verify printing belongs to same card and set if changed
        if (isset($validated['printing_id']) && $validated['printing_id'] !== $item->printing_id) {
            $newPrinting = UnifiedPrinting::find($validated['printing_id']);
            $currentPrinting = $item->printing;
            if (! $newPrinting || ! $currentPrinting) {
                abort(422, 'Invalid printing');
            }
            // Must be same card and same set
            if ($newPrinting->card_id !== $currentPrinting->card_id || $newPrinting->set_code !== $currentPrinting->set_code) {
                abort(422, 'Invalid printing for this card');
            }
        }

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

    // ========== EXPORT ==========

    /**
     * Export inventory to TCG Powertools CSV format.
     */
    public function export(Request $request, string $slug): StreamedResponse
    {
        $game = $this->getGame($slug);
        $unifiedSlug = $this->getUnifiedGameSlug($slug);
        $userId = Auth::id();

        $query = UnifiedInventory::query()
            ->where('user_id', $userId)
            ->where('in_collection', false)
            ->with(['printing.card', 'printing.set'])
            ->whereHas('printing.card', fn ($q) => $q->where('game', $unifiedSlug));

        // Apply filters if provided
        if ($request->filled('lot')) {
            $query->where('lot_id', $request->input('lot'));
        }

        if ($request->filled('condition')) {
            $query->where('condition', $request->input('condition'));
        }

        $items = $query->orderBy('created_at')->get();

        // For FAB: Find card names that have multiple pitch versions (need color in export name)
        $multiColorCardNames = [];
        if ($unifiedSlug === 'fab') {
            $multiColorCardNames = DB::table('unified_cards')
                ->where('game', 'fab')
                ->whereNotNull('game_specific')
                ->selectRaw('name, COUNT(DISTINCT JSON_EXTRACT(game_specific, "$.pitch")) as pitch_count')
                ->groupBy('name')
                ->having('pitch_count', '>', 1)
                ->pluck('name')
                ->flip()
                ->toArray();
        }

        // For FAB: Initialize Cardmarket lookup service
        $cardmarketLookup = null;
        if ($unifiedSlug === 'fab') {
            $cardmarketLookup = app(CardmarketLookupService::class);
        }

        $filename = sprintf('inventory-%s-%s.csv', $slug, now()->format('Y-m-d'));

        return response()->streamDownload(function () use ($items, $multiColorCardNames, $cardmarketLookup) {
            $handle = fopen('php://output', 'w');

            // BOM for Excel UTF-8 compatibility
            fwrite($handle, "\xEF\xBB\xBF");

            // Header row
            fputcsv($handle, [
                'idProduct',
                'quantity',
                'name',
                'set',
                'condition',
                'language',
                'isFoil',
                'price',
                'comment',
            ]);

            foreach ($items as $item) {
                $printing = $item->printing;
                $card = $printing->card;

                // Get collector number and set code
                $collectorNumber = $printing->collector_number ?? '';
                $setCode = $printing->set_code ?? '';

                // Get color if this card has multiple pitch versions
                $color = $card->game_specific['color'] ?? null;
                $colorForExport = ($color && isset($multiColorCardNames[$card->name])) ? $color : null;

                // Look up Cardmarket ID if available
                $idProduct = '';
                if ($cardmarketLookup) {
                    $cardmarketId = $cardmarketLookup->findCardmarketId(
                        $collectorNumber,
                        $setCode,
                        $card->name,
                        $printing->finish,
                        $colorForExport
                    );
                    $idProduct = $cardmarketId ?? '';
                }

                // Build card name for Cardmarket format:
                // "Card Name (Color) (Regular)" or "Card Name (Color) (Rainbow Foil)"
                // Color is only added if the card exists in multiple pitch versions
                $cardName = $card->name;

                if ($colorForExport) {
                    $cardName .= ' ('.$colorForExport.')';
                }

                // Add finish: "Regular" for Standard, otherwise the finish label
                $finishLabel = $printing->finish_label ?? 'Standard';
                if ($finishLabel === 'Standard') {
                    $cardName .= ' (Regular)';
                } else {
                    $cardName .= ' ('.$finishLabel.')';
                }

                // Map condition to TCG Powertools format
                $condition = $this->mapConditionForExport($item->condition);

                // Map language to full name
                $language = $this->mapLanguageForExport($item->language);

                // Price in cents (TCG Powertools expects cents)
                $price = $item->purchase_price ? (int) ($item->purchase_price * 100) : '';

                // Get set name - use Cardmarket format with colon for Mastery Packs
                $setName = $printing->set?->name ?? $printing->set_name ?? $printing->set_code ?? '';
                $setName = preg_replace('/^(Mastery Pack) /', '$1: ', $setName);

                fputcsv($handle, [
                    $idProduct,
                    $item->quantity,
                    $cardName,
                    $setName,
                    $condition,
                    $language,
                    '', // isFoil not needed when foiling is in name
                    $price,
                    $item->notes ?? '',
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Check if a finish value represents a foil card.
     */
    private function isFoilFinish(?string $finish, string $gameSlug): bool
    {
        if (! $finish) {
            return false;
        }

        // FAB foil finishes
        if ($gameSlug === 'fab') {
            return in_array($finish, ['R', 'C', 'G'], true); // Rainbow, Cold, Gold
        }

        // MTG foil finishes
        if ($gameSlug === 'magic-the-gathering' || $gameSlug === 'mtg') {
            return in_array($finish, ['foil', 'etched'], true);
        }

        // Default: check if finish contains "foil"
        return str_contains(strtolower($finish), 'foil');
    }

    /**
     * Map internal condition codes to TCG Powertools format.
     */
    private function mapConditionForExport(string $condition): string
    {
        // TCG Powertools uses same codes
        return $condition;
    }

    /**
     * Map language codes to full language names.
     */
    private function mapLanguageForExport(string $language): string
    {
        $map = [
            'EN' => 'English',
            'DE' => 'German',
            'FR' => 'French',
            'ES' => 'Spanish',
            'IT' => 'Italian',
            'PT' => 'Portuguese',
            'JP' => 'Japanese',
            'JA' => 'Japanese',
            'KO' => 'Korean',
            'ZH' => 'Chinese',
            'RU' => 'Russian',
        ];

        return $map[$language] ?? $language;
    }
}
