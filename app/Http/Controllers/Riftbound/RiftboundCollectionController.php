<?php

namespace App\Http\Controllers\Riftbound;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Models\GameFormat;
use App\Models\Riftbound\RiftboundCollection;
use App\Models\Riftbound\RiftboundPrinting;
use App\Services\PlaysetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class RiftboundCollectionController extends Controller
{
    public function __construct(
        private PlaysetService $playsetService
    ) {}

    public function index(Request $request): Response
    {
        $userId = Auth::id();
        $riftboundGame = Game::where('slug', 'riftbound')->first();

        $query = RiftboundCollection::where('user_id', $userId)
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
        $playsetFilter = $request->input('playset');

        $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $statsQuery = RiftboundCollection::where('user_id', $userId);

        $stats = [
            'unique_cards' => (clone $statsQuery)->distinct('riftbound_printing_id')->count('riftbound_printing_id'),
            'total_cards' => (clone $statsQuery)->sum('quantity'),
        ];

        // Get game formats for Riftbound
        $formats = $riftboundGame ? GameFormat::where('game_id', $riftboundGame->id)->active()->orderBy('sort_order')->get() : collect();

        // Get playset data if format is selected
        $playsetData = [];
        if ($selectedFormatId && $riftboundGame) {
            $this->playsetService->createDefaultRulesForUser($userId, (int) $selectedFormatId);

            $playsetStatus = $this->playsetService->getPlaysetStatus($userId, (int) $selectedFormatId);
            $playsetData = $playsetStatus->toArray();

            if ($playsetFilter === 'incomplete') {
                $incompleteCardNames = collect($playsetData)
                    ->filter(fn ($p) => ! $p['complete'])
                    ->keys()
                    ->all();

                $query = RiftboundCollection::where('user_id', $userId)
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

                $query = RiftboundCollection::where('user_id', $userId)
                    ->with(['printing.card', 'printing.set'])
                    ->whereHas('printing.card', fn ($q) => $q->whereIn('name', $completeCardNames));

                if ($request->filled('search')) {
                    $search = $request->input('search');
                    $query->whereHas('printing.card', fn ($q) => $q->where('name', 'like', "%{$search}%"));
                }

                $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();
            }
        }

        return Inertia::render('riftbound/collection', [
            'collection' => $collection,
            'filters' => $request->only(['search', 'condition', 'rarity', 'foiling', 'format', 'playset']),
            'conditions' => RiftboundCollection::CONDITIONS ?? RiftboundPrinting::CONDITIONS ?? [
                'NM' => 'Near Mint',
                'LP' => 'Lightly Played',
                'MP' => 'Moderately Played',
                'HP' => 'Heavily Played',
                'DM' => 'Damaged',
            ],
            'rarities' => RiftboundPrinting::RARITIES,
            'foilings' => RiftboundPrinting::FOILINGS,
            'stats' => $stats,
            'formats' => $formats,
            'playsetData' => $playsetData,
        ]);
    }

    public function update(Request $request, RiftboundCollection $item): RedirectResponse
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'condition' => ['sometimes', 'string', 'in:NM,LP,MP,HP,DM'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(RiftboundCollection $item): RedirectResponse
    {
        $this->authorize('delete', $item);

        $item->delete();

        return back();
    }

    public function deleteMultiple(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:riftbound_collection,id'],
        ]);

        RiftboundCollection::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->delete();

        return back();
    }
}
