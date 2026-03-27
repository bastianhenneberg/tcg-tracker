<?php

namespace App\Http\Controllers;

use App\Models\Deck;
use App\Services\DeckInventoryService;
use Illuminate\Http\RedirectResponse;

class DeckInventoryController extends Controller
{
    public function __construct(
        private DeckInventoryService $deckInventoryService
    ) {}

    /**
     * Mark deck cards as "in deck" by assigning matching inventory items.
     */
    public function markInDeck(string $slug, Deck $deck): RedirectResponse
    {
        $this->authorize('update', $deck);

        $result = $this->deckInventoryService->assignInventoryToDeck($deck);

        $assigned = $result['assigned'];
        $missing = $result['missing'];

        if (empty($missing)) {
            return back()->with('success', "Alle {$assigned} Karten wurden erfolgreich zugeordnet.");
        }

        $missingCount = array_sum($missing);
        $missingList = collect($missing)
            ->map(fn ($count, $name) => "{$count}x {$name}")
            ->take(5)
            ->implode(', ');

        $moreCount = count($missing) > 5 ? count($missing) - 5 : 0;
        $moreText = $moreCount > 0 ? " und {$moreCount} weitere" : '';

        return back()->with('warning', "{$assigned} Karten zugeordnet. {$missingCount} fehlen: {$missingList}{$moreText}");
    }

    /**
     * Clear all inventory assignments for a deck.
     */
    public function clearMarkings(string $slug, Deck $deck): RedirectResponse
    {
        $this->authorize('update', $deck);

        $deleted = $this->deckInventoryService->clearAssignments($deck);

        return back()->with('success', "Markierungen für {$deleted} Karten wurden entfernt.");
    }
}
