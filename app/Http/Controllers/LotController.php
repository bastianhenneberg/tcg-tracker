<?php

namespace App\Http\Controllers;

use App\Models\Box;
use App\Models\Lot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class LotController extends Controller
{
    public function index(): Response
    {
        $lots = Lot::where('user_id', Auth::id())
            ->with('box')
            ->withCount('fabInventoryItems')
            ->orderByDesc('lot_number')
            ->paginate(24)
            ->withQueryString();

        return Inertia::render('inventory/lots/index', [
            'lots' => $lots,
            'boxes' => Box::where('user_id', Auth::id())->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'box_id' => ['required', 'exists:boxes,id'],
            'card_range_start' => ['nullable', 'integer', 'min:1'],
            'card_range_end' => ['nullable', 'integer', 'min:1', 'gte:card_range_start'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $box = Box::findOrFail($validated['box_id']);
        $this->authorize('view', $box);

        Lot::create([
            'user_id' => Auth::id(),
            'box_id' => $validated['box_id'],
            'lot_number' => Lot::nextLotNumber(Auth::id()),
            'card_range_start' => $validated['card_range_start'] ?? null,
            'card_range_end' => $validated['card_range_end'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'scanned_at' => now(),
        ]);

        return back();
    }

    public function show(Lot $lot): Response
    {
        $this->authorize('view', $lot);

        $lot->load([
            'box',
            'fabInventoryItems' => fn ($q) => $q
                ->with(['printing.card', 'printing.set'])
                ->orderBy('position_in_lot'),
        ]);

        return Inertia::render('inventory/lots/show', [
            'lot' => $lot,
            'boxes' => Box::where('user_id', Auth::id())->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, Lot $lot): RedirectResponse
    {
        $this->authorize('update', $lot);

        $validated = $request->validate([
            'box_id' => ['required', 'exists:boxes,id'],
            'card_range_start' => ['nullable', 'integer', 'min:1'],
            'card_range_end' => ['nullable', 'integer', 'min:1', 'gte:card_range_start'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $box = Box::findOrFail($validated['box_id']);
        $this->authorize('view', $box);

        $lot->update($validated);

        return back();
    }

    public function destroy(Lot $lot): RedirectResponse
    {
        $this->authorize('delete', $lot);

        $lot->delete();

        return redirect()->route('lots.index');
    }
}
