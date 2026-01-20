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
    public function index(Request $request): Response
    {
        $query = Box::where('user_id', Auth::id())
            ->withCount('lots');

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
        $allowedSorts = ['name', 'created_at', 'lots_count'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection === 'desc' ? 'desc' : 'asc');
        }

        $boxes = $query->paginate($request->input('per_page', 25))->withQueryString();

        return Inertia::render('inventory/boxes/index', [
            'boxes' => $boxes,
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
