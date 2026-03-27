<?php

namespace App\Http\Controllers;

use App\Models\Binder;
use App\Models\BinderPage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BinderController extends Controller
{
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

        $binder->load(['pages' => fn ($q) => $q->withCount('inventoryItems')->orderBy('page_number')]);

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
            'totalPages' => $binder->pages->max('page_number') ?? 0,
        ]);
    }

    public function update(Request $request, Binder $binder): RedirectResponse
    {
        $this->authorize('update', $binder);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'color' => ['nullable', 'string', 'max:50'],
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
