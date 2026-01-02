<?php

namespace App\Http\Controllers\Op;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Models\GameFormat;
use App\Models\Op\OpCollection;
use App\Models\Op\OpPrinting;
use App\Services\PlaysetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class OpCollectionController extends Controller
{
    public function __construct(
        private PlaysetService $playsetService
    ) {}

    public function index(Request $request): Response
    {
        $userId = Auth::id();
        $opGame = Game::where('slug', 'onepiece')->first();

        $query = OpCollection::where('user_id', $userId)
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

        if ($request->filled('card_type')) {
            $query->whereHas('printing.card', fn ($q) => $q->where('card_type', $request->input('card_type')));
        }

        if ($request->filled('color')) {
            $color = $request->input('color');
            $query->whereHas('printing.card', fn ($q) => $q->where('color', $color)->orWhere('color_secondary', $color));
        }

        // Playset filter
        $selectedFormatId = $request->input('format');
        $playsetFilter = $request->input('playset');

        $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $statsQuery = OpCollection::where('user_id', $userId);

        $stats = [
            'unique_cards' => (clone $statsQuery)->distinct('op_printing_id')->count('op_printing_id'),
            'total_cards' => (clone $statsQuery)->sum('quantity'),
        ];

        // Get game formats for One Piece
        $formats = $opGame ? GameFormat::where('game_id', $opGame->id)->active()->orderBy('sort_order')->get() : collect();

        // Get playset data if format is selected
        $playsetData = [];
        if ($selectedFormatId && $opGame) {
            $this->playsetService->createDefaultRulesForUser($userId, (int) $selectedFormatId);
            $playsetStatus = $this->playsetService->getPlaysetStatus($userId, (int) $selectedFormatId);
            $playsetData = $playsetStatus->toArray();

            if ($playsetFilter === 'incomplete') {
                $incompleteCardNames = collect($playsetData)
                    ->filter(fn ($p) => ! $p['complete'])
                    ->keys()
                    ->all();

                $query = OpCollection::where('user_id', $userId)
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

                $query = OpCollection::where('user_id', $userId)
                    ->with(['printing.card', 'printing.set'])
                    ->whereHas('printing.card', fn ($q) => $q->whereIn('name', $completeCardNames));

                if ($request->filled('search')) {
                    $search = $request->input('search');
                    $query->whereHas('printing.card', fn ($q) => $q->where('name', 'like', "%{$search}%"));
                }

                $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();
            }
        }

        return Inertia::render('op/collection', [
            'collection' => $collection,
            'filters' => $request->only(['search', 'condition', 'rarity', 'card_type', 'color', 'format', 'playset']),
            'conditions' => OpCollection::CONDITIONS,
            'rarities' => OpPrinting::RARITIES,
            'cardTypes' => \App\Models\Op\OpCard::CARD_TYPES,
            'colors' => \App\Models\Op\OpCard::COLORS,
            'stats' => $stats,
            'formats' => $formats,
            'playsetData' => $playsetData,
        ]);
    }

    public function update(Request $request, OpCollection $item): RedirectResponse
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'condition' => ['sometimes', 'string', 'in:'.implode(',', array_keys(OpCollection::CONDITIONS))],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(OpCollection $item): RedirectResponse
    {
        $this->authorize('delete', $item);

        $item->delete();

        return back();
    }

    public function deleteMultiple(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:op_collection,id'],
        ]);

        OpCollection::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->delete();

        return back();
    }
}
