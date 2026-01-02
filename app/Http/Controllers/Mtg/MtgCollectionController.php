<?php

namespace App\Http\Controllers\Mtg;

use App\Http\Controllers\Controller;
use App\Models\Mtg\MtgCollection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MtgCollectionController extends Controller
{
    public const CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DM' => 'Damaged',
    ];

    public const FINISHES = [
        'nonfoil' => 'Non-Foil',
        'foil' => 'Foil',
        'etched' => 'Etched Foil',
    ];

    public function index(Request $request): Response
    {
        $query = MtgCollection::where('user_id', Auth::id())
            ->with(['printing.card', 'printing.set']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('printing.card', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('printing', fn ($p) => $p->where('number', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('condition')) {
            $query->where('condition', $request->input('condition'));
        }

        if ($request->filled('rarity')) {
            $query->whereHas('printing', fn ($q) => $q->where('rarity', $request->input('rarity')));
        }

        if ($request->filled('finish')) {
            $query->where('finish', $request->input('finish'));
        }

        if ($request->filled('color')) {
            $color = $request->input('color');
            if ($color === 'C') {
                $query->whereHas('printing.card', fn ($q) => $q->whereJsonLength('colors', 0));
            } else {
                $query->whereHas('printing.card', fn ($q) => $q->whereJsonContains('colors', $color));
            }
        }

        $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $totalCards = MtgCollection::where('user_id', Auth::id())->sum('quantity');
        $uniqueCards = MtgCollection::where('user_id', Auth::id())->count();

        return Inertia::render('mtg/collection', [
            'collection' => $collection,
            'filters' => $request->only(['search', 'condition', 'rarity', 'finish', 'color']),
            'conditions' => self::CONDITIONS,
            'finishes' => self::FINISHES,
            'rarities' => [
                'common' => 'Common',
                'uncommon' => 'Uncommon',
                'rare' => 'Rare',
                'mythic' => 'Mythic Rare',
            ],
            'colors' => [
                'W' => 'White',
                'U' => 'Blue',
                'B' => 'Black',
                'R' => 'Red',
                'G' => 'Green',
                'C' => 'Colorless',
            ],
            'stats' => [
                'total' => $totalCards,
                'unique' => $uniqueCards,
            ],
        ]);
    }

    public function update(Request $request, MtgCollection $item): RedirectResponse
    {
        if ($item->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'quantity' => ['sometimes', 'required', 'integer', 'min:1'],
            'condition' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys(self::CONDITIONS))],
            'finish' => ['sometimes', 'required', 'string', 'in:'.implode(',', array_keys(self::FINISHES))],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(MtgCollection $item): RedirectResponse
    {
        if ($item->user_id !== Auth::id()) {
            abort(403);
        }

        $item->delete();

        return back();
    }

    public function deleteMultiple(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['exists:mtg_collection,id'],
        ]);

        MtgCollection::whereIn('id', $validated['ids'])
            ->where('user_id', Auth::id())
            ->delete();

        return back();
    }
}
