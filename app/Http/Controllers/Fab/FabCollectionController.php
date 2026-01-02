<?php

namespace App\Http\Controllers\Fab;

use App\Http\Controllers\Controller;
use App\Models\Fab\FabCollection;
use App\Models\Fab\FabPrinting;
use App\Models\Game;
use App\Models\GameFormat;
use App\Services\PlaysetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FabCollectionController extends Controller
{
    public function __construct(
        private PlaysetService $playsetService
    ) {}

    public function index(Request $request): Response
    {
        $userId = Auth::id();
        $fabGame = Game::where('slug', 'fab')->first();

        $query = FabCollection::where('user_id', $userId)
            ->with(['printing.card', 'printing.set']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('printing.card', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        if ($request->filled('condition')) {
            $query->where('condition', $request->input('condition'));
        }

        if ($request->filled('rarity')) {
            $query->whereHas('printing', fn ($q) => $q->where('rarity', $request->input('rarity')));
        }

        if ($request->filled('foiling')) {
            $query->whereHas('printing', fn ($q) => $q->where('foiling', $request->input('foiling')));
        }

        // Playset filter
        $selectedFormatId = $request->input('format');
        $playsetFilter = $request->input('playset'); // 'incomplete', 'complete', or null

        $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $statsQuery = FabCollection::where('user_id', $userId);

        $stats = [
            'unique_cards' => (clone $statsQuery)->distinct('fab_printing_id')->count('fab_printing_id'),
            'total_cards' => (clone $statsQuery)->sum('quantity'),
        ];

        // Get game formats for FAB
        $formats = $fabGame ? GameFormat::where('game_id', $fabGame->id)->active()->orderBy('sort_order')->get() : collect();

        // Get playset data if format is selected
        $playsetData = [];
        if ($selectedFormatId && $fabGame) {
            // Ensure user has default rules
            $this->playsetService->createDefaultRulesForUser($userId, (int) $selectedFormatId);

            $playsetStatus = $this->playsetService->getPlaysetStatus($userId, (int) $selectedFormatId);
            $playsetData = $playsetStatus->toArray();

            // Apply playset filter
            if ($playsetFilter === 'incomplete') {
                $incompleteCardNames = collect($playsetData)
                    ->filter(fn ($p) => ! $p['complete'])
                    ->keys()
                    ->all();

                // Re-query with filter
                $query = FabCollection::where('user_id', $userId)
                    ->with(['printing.card', 'printing.set'])
                    ->whereHas('printing.card', fn ($q) => $q->whereIn('name', $incompleteCardNames));

                if ($request->filled('search')) {
                    $search = $request->input('search');
                    $query->whereHas('printing.card', fn ($q) => $q->where('name', 'like', "%{$search}%"));
                }

                $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();
            } elseif ($playsetFilter === 'complete') {
                $completeCardNames = collect($playsetData)
                    ->filter(fn ($p) => $p['complete'])
                    ->keys()
                    ->all();

                $query = FabCollection::where('user_id', $userId)
                    ->with(['printing.card', 'printing.set'])
                    ->whereHas('printing.card', fn ($q) => $q->whereIn('name', $completeCardNames));

                if ($request->filled('search')) {
                    $search = $request->input('search');
                    $query->whereHas('printing.card', fn ($q) => $q->where('name', 'like', "%{$search}%"));
                }

                $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();
            }
        }

        return Inertia::render('fab/collection', [
            'collection' => $collection,
            'filters' => $request->only(['search', 'condition', 'rarity', 'foiling', 'format', 'playset']),
            'conditions' => FabCollection::CONDITIONS,
            'rarities' => FabPrinting::RARITIES,
            'foilings' => FabPrinting::FOILINGS,
            'stats' => $stats,
            'formats' => $formats,
            'playsetData' => $playsetData,
        ]);
    }

    public function update(Request $request, FabCollection $item): RedirectResponse
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'condition' => ['sometimes', 'string', 'in:'.implode(',', array_keys(FabCollection::CONDITIONS))],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(FabCollection $item): RedirectResponse
    {
        $this->authorize('delete', $item);

        $item->delete();

        return back();
    }

    public function deleteMultiple(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:fab_collection,id'],
        ]);

        FabCollection::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->delete();

        return back();
    }
}
