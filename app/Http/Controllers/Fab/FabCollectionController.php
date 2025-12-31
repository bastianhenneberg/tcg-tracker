<?php

namespace App\Http\Controllers\Fab;

use App\Http\Controllers\Controller;
use App\Models\Fab\FabCollection;
use App\Models\Fab\FabPrinting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FabCollectionController extends Controller
{
    public function index(Request $request): Response
    {
        $query = FabCollection::where('user_id', Auth::id())
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

        $collection = $query->orderByDesc('created_at')->paginate(24)->withQueryString();

        $statsQuery = FabCollection::where('user_id', Auth::id());

        $stats = [
            'unique_cards' => (clone $statsQuery)->distinct('fab_printing_id')->count('fab_printing_id'),
            'total_cards' => (clone $statsQuery)->sum('quantity'),
        ];

        return Inertia::render('fab/collection', [
            'collection' => $collection,
            'filters' => $request->only(['search', 'condition', 'rarity', 'foiling']),
            'conditions' => FabCollection::CONDITIONS,
            'rarities' => FabPrinting::RARITIES,
            'foilings' => FabPrinting::FOILINGS,
            'stats' => $stats,
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
}
