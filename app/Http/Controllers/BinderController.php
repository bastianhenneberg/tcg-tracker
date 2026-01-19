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
    public function index(): Response
    {
        $binders = Binder::where('user_id', Auth::id())
            ->withCount('pages')
            ->withCount('inventoryItems')
            ->orderBy('name')
            ->get();

        return Inertia::render('collection/binders/index', [
            'binders' => $binders,
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

        // Load items for current page if it exists
        $slots = [];
        if ($currentPage) {
            $items = $currentPage->inventoryItems()
                ->with(['printing.card', 'printing.set'])
                ->get()
                ->keyBy('binder_slot');

            for ($i = 1; $i <= BinderPage::SLOTS_PER_PAGE; $i++) {
                $slots[$i] = $items->get($i);
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
