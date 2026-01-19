<?php

namespace App\Http\Controllers;

use App\Http\Requests\AddCardRequest;
use App\Http\Requests\MoveCardRequest;
use App\Http\Requests\StoreDeckRequest;
use App\Http\Requests\UpdateDeckRequest;
use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckZone;
use App\Models\Game;
use App\Models\GameFormat;
use App\Models\UnifiedPrinting;
use App\Services\DeckbuilderService;
use App\Services\DeckValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DeckController extends Controller
{
    public function __construct(
        private DeckbuilderService $deckbuilderService,
        private DeckValidationService $validationService
    ) {}

    public function index(string $slug): Response
    {
        $game = Game::where('slug', $slug)->firstOrFail();

        $decks = Deck::where('user_id', Auth::id())
            ->whereHas('gameFormat', fn ($q) => $q->where('game_id', $game->id))
            ->with(['gameFormat'])
            ->withCount('cards')
            ->orderByDesc('updated_at')
            ->get();

        return Inertia::render('decks/index', [
            'game' => $game,
            'decks' => $decks,
        ]);
    }

    public function create(string $slug): Response
    {
        $game = Game::where('slug', $slug)->firstOrFail();

        $formats = GameFormat::where('game_id', $game->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('decks/create', [
            'game' => $game,
            'formats' => $formats,
        ]);
    }

    public function store(StoreDeckRequest $request, string $slug): RedirectResponse
    {
        $game = Game::where('slug', $slug)->firstOrFail();
        $validated = $request->validated();

        // Verify format belongs to game
        $format = GameFormat::where('id', $validated['game_format_id'])
            ->where('game_id', $game->id)
            ->firstOrFail();

        $deck = Deck::create([
            'user_id' => Auth::id(),
            ...$validated,
        ]);

        return redirect()->route('decks.builder', ['slug' => $slug, 'deck' => $deck->id]);
    }

    public function show(string $slug, Deck $deck): Response
    {
        $this->authorize('view', $deck);

        $game = Game::where('slug', $slug)->firstOrFail();
        $deckData = $this->deckbuilderService->getDeckWithCards($deck);

        return Inertia::render('decks/show', [
            'game' => $game,
            ...$deckData,
        ]);
    }

    public function edit(string $slug, Deck $deck): Response
    {
        $this->authorize('update', $deck);

        $game = Game::where('slug', $slug)->firstOrFail();

        $formats = GameFormat::where('game_id', $game->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('decks/edit', [
            'game' => $game,
            'deck' => $deck,
            'formats' => $formats,
        ]);
    }

    public function update(UpdateDeckRequest $request, string $slug, Deck $deck): RedirectResponse
    {
        $deck->update($request->validated());

        return redirect()->route('decks.show', ['slug' => $slug, 'deck' => $deck->id]);
    }

    public function destroy(string $slug, Deck $deck): RedirectResponse
    {
        $this->authorize('delete', $deck);

        $deck->delete();

        return redirect()->route('decks.index', ['slug' => $slug]);
    }

    // Builder Actions

    public function builder(string $slug, Deck $deck): Response
    {
        $this->authorize('update', $deck);

        $game = Game::where('slug', $slug)->firstOrFail();
        $deckData = $this->deckbuilderService->getDeckWithCards($deck);

        $zones = DeckZone::where('game_format_id', $deck->game_format_id)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('decks/builder', [
            'game' => $game,
            'deck' => $deck->load('gameFormat'),
            'zones' => $zones,
            'deckCards' => $deckData['zones'],
            'validation' => $deckData['validation'],
            'statistics' => $deckData['statistics'],
        ]);
    }

    public function addCard(AddCardRequest $request, string $slug, Deck $deck): JsonResponse
    {
        $validated = $request->validated();

        $printing = UnifiedPrinting::findOrFail($validated['printing_id']);
        $qty = $validated['quantity'] ?? 1;

        $deckCard = $this->deckbuilderService->addCard($deck, $printing, $validated['zone'], $qty);

        return response()->json([
            'success' => true,
            'deckCard' => $deckCard->load(['printing.card', 'zone']),
            'validation' => $this->validationService->validateDeck($deck),
            'statistics' => $this->deckbuilderService->getStatistics($deck),
        ]);
    }

    public function removeCard(string $slug, Deck $deck, DeckCard $card): JsonResponse
    {
        $this->authorize('update', $deck);

        if ($card->deck_id !== $deck->id) {
            abort(403);
        }

        $this->deckbuilderService->removeCard($deck, $card->id);

        return response()->json([
            'success' => true,
            'validation' => $this->validationService->validateDeck($deck),
            'statistics' => $this->deckbuilderService->getStatistics($deck),
        ]);
    }

    public function moveCard(MoveCardRequest $request, string $slug, Deck $deck, DeckCard $card): JsonResponse
    {
        if ($card->deck_id !== $deck->id) {
            abort(403);
        }

        $deckCard = $this->deckbuilderService->moveCard($deck, $card->id, $request->validated('target_zone'));

        return response()->json([
            'success' => true,
            'deckCard' => $deckCard->load(['printing.card', 'zone']),
            'validation' => $this->validationService->validateDeck($deck),
            'statistics' => $this->deckbuilderService->getStatistics($deck),
        ]);
    }

    public function updateQuantity(Request $request, string $slug, Deck $deck, DeckCard $card): JsonResponse
    {
        $this->authorize('update', $deck);

        if ($card->deck_id !== $deck->id) {
            abort(403);
        }

        $qty = $request->validate(['quantity' => ['required', 'integer', 'min:0', 'max:99']])['quantity'];

        $deckCard = $this->deckbuilderService->updateQuantity($deck, $card->id, $qty);

        return response()->json([
            'success' => true,
            'deckCard' => $qty > 0 ? $deckCard->load(['printing.card', 'zone']) : null,
            'validation' => $this->validationService->validateDeck($deck),
            'statistics' => $this->deckbuilderService->getStatistics($deck),
        ]);
    }

    public function validate(string $slug, Deck $deck): JsonResponse
    {
        $this->authorize('view', $deck);

        return response()->json($this->validationService->validateDeck($deck));
    }

    public function searchCards(Request $request, string $slug, Deck $deck): JsonResponse
    {
        $this->authorize('view', $deck);

        $query = $request->input('q', '');
        $perPage = min((int) $request->input('per_page', 20), 100);

        $results = $this->deckbuilderService->searchCards($deck, $query, $perPage);

        return response()->json($results);
    }

    public function export(string $slug, Deck $deck, string $format = 'txt'): StreamedResponse|JsonResponse
    {
        $this->authorize('view', $deck);

        if ($format === 'json') {
            return response()->json([
                'deck' => $deck->load('gameFormat'),
                ...$this->deckbuilderService->getDeckWithCards($deck),
            ]);
        }

        // Default to text export
        $content = $this->deckbuilderService->exportAsText($deck);
        $filename = preg_replace('/[^a-zA-Z0-9-_]/', '_', $deck->name).'.txt';

        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => 'text/plain',
        ]);
    }
}
