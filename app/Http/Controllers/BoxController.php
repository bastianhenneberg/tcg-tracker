<?php

namespace App\Http\Controllers;

use App\Models\Box;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BoxController extends Controller
{
    public function index(): Response
    {
        $boxes = Box::where('user_id', Auth::id())
            ->withCount('lots')
            ->orderBy('name')
            ->get();

        return Inertia::render('inventory/boxes/index', [
            'boxes' => $boxes,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        Box::create([
            'user_id' => Auth::id(),
            ...$validated,
        ]);

        return back();
    }

    public function show(Box $box): Response
    {
        $this->authorize('view', $box);

        $box->load(['lots' => fn ($q) => $q->withCount('inventoryItems')->orderByDesc('lot_number')]);

        return Inertia::render('inventory/boxes/show', [
            'box' => $box,
        ]);
    }

    public function update(Request $request, Box $box): RedirectResponse
    {
        $this->authorize('update', $box);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $box->update($validated);

        return back();
    }

    public function destroy(Box $box): RedirectResponse
    {
        $this->authorize('delete', $box);

        $box->delete();

        return redirect()->route('boxes.index');
    }
}
