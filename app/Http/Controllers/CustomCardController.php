<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCustomCardRequest;
use App\Models\Custom\CustomCard;
use App\Models\Custom\CustomPrinting;
use App\Models\Game;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomCardController extends Controller
{
    /**
     * Display custom cards management page.
     */
    public function index(Request $request): Response
    {
        $userId = Auth::id();
        $games = Game::with(['attributes'])->get();

        // Accept either game ID or slug
        $gameParam = $request->input('game');
        $selectedGameId = $gameParam;

        if ($gameParam && !is_numeric($gameParam)) {
            // It's a slug, look up the game
            $game = $games->firstWhere('slug', $gameParam);
            $selectedGameId = $game?->id ?? $games->first()?->id;
        } elseif (!$gameParam) {
            $selectedGameId = $games->first()?->id;
        }

        $search = $request->input('search');

        $cardsQuery = CustomCard::where('user_id', $userId)
            ->with(['printings', 'game', 'linkedFabCard.printings']);

        if ($selectedGameId) {
            $cardsQuery->where('game_id', $selectedGameId);
        }

        if ($search) {
            $cardsQuery->where('name', 'like', "%{$search}%");
        }

        $cards = $cardsQuery->orderBy('name')->paginate(25)->withQueryString();

        // Get rarities and foilings for the selected game
        $selectedGame = $games->firstWhere('id', $selectedGameId);
        $rarities = [];
        $foilings = [];

        if ($selectedGame) {
            foreach ($selectedGame->attributes as $attr) {
                if ($attr->type === 'rarity') {
                    $rarities[$attr->key] = $attr->label;
                }
                if ($attr->type === 'foiling') {
                    $foilings[$attr->key] = $attr->label;
                }
            }
        }

        return Inertia::render('custom-cards/index', [
            'games' => $games,
            'selectedGameId' => $selectedGameId,
            'cards' => $cards,
            'filters' => [
                'search' => $search,
            ],
            'rarities' => $rarities,
            'foilings' => $foilings,
        ]);
    }

    /**
     * Store a new custom card with its printing (for scanner).
     */
    public function store(StoreCustomCardRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $userId = $request->user()->id;

        $result = DB::transaction(function () use ($validated, $userId) {
            // Check if card already exists for this user and game
            $card = CustomCard::where('user_id', $userId)
                ->where('game_id', $validated['game_id'])
                ->where('name', $validated['name'])
                ->first();

            if (! $card) {
                // Create the card
                $card = CustomCard::create([
                    'user_id' => $userId,
                    'game_id' => $validated['game_id'],
                    'linked_fab_card_id' => $validated['linked_fab_card_id'] ?? null,
                    'name' => $validated['name'],
                    'types' => $validated['types'] ?? null,
                    'traits' => $validated['traits'] ?? null,
                    'functional_text' => $validated['functional_text'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                    'attributes' => $validated['attributes'] ?? null,
                ]);
            }

            // Create the printing
            $printing = CustomPrinting::create([
                'custom_card_id' => $card->id,
                'user_id' => $userId,
                'set_name' => $validated['set_name'] ?? null,
                'collector_number' => $validated['collector_number'] ?? null,
                'rarity' => $validated['rarity'] ?? null,
                'foiling' => $validated['foiling'] ?? null,
                'language' => $validated['language'] ?? 'DE',
                'edition' => $validated['edition'] ?? null,
            ]);

            return [
                'id' => $printing->id,
                'card_id' => $card->id,
                'card_name' => $card->name,
                'set_name' => $printing->set_name ?? 'Custom',
                'collector_number' => ($printing->set_name ?? '').($printing->collector_number ?? '') ?: '-',
                'rarity' => $printing->rarity,
                'foiling' => $printing->foiling,
                'language' => $printing->language,
                'is_custom' => true,
            ];
        });

        return back()->with('customCard', $result);
    }

    /**
     * Create a new custom card from the management page.
     */
    public function create(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'game_id' => ['required', 'exists:games,id'],
            'linked_fab_card_id' => ['nullable', 'exists:fab_cards,id'],
            'name' => ['required', 'string', 'max:255'],
            'types' => ['nullable', 'array'],
            'traits' => ['nullable', 'array'],
            'functional_text' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'set_name' => ['nullable', 'string', 'max:255'],
            'collector_number' => ['nullable', 'string', 'max:50'],
            'rarity' => ['nullable', 'string', 'max:20'],
            'foiling' => ['nullable', 'string', 'max:20'],
            'language' => ['nullable', 'string', 'max:10'],
        ]);

        $userId = Auth::id();

        DB::transaction(function () use ($validated, $userId) {
            $card = CustomCard::create([
                'user_id' => $userId,
                'game_id' => $validated['game_id'],
                'linked_fab_card_id' => $validated['linked_fab_card_id'] ?? null,
                'name' => $validated['name'],
                'types' => $validated['types'] ?? null,
                'traits' => $validated['traits'] ?? null,
                'functional_text' => $validated['functional_text'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Create a default printing if set info provided
            if (! empty($validated['set_name']) || ! empty($validated['collector_number'])) {
                CustomPrinting::create([
                    'custom_card_id' => $card->id,
                    'user_id' => $userId,
                    'set_name' => $validated['set_name'] ?? null,
                    'collector_number' => $validated['collector_number'] ?? null,
                    'rarity' => $validated['rarity'] ?? null,
                    'foiling' => $validated['foiling'] ?? null,
                    'language' => $validated['language'] ?? 'DE',
                ]);
            }
        });

        return back()->with('success', 'Karte erstellt.');
    }

    /**
     * Search FaB cards for linking custom cards to main database.
     */
    public function searchFabCards(Request $request): JsonResponse
    {
        $query = $request->input('q', '');
        if (strlen($query) < 2) {
            return response()->json([]);
        }

        $cards = \App\Models\Fab\FabCard::with(['printings' => fn ($q) => $q->limit(1)])
            ->where('name', 'like', "%{$query}%")
            ->orderBy('name')
            ->limit(20)
            ->get()
            ->map(fn ($card) => [
                'id' => $card->id,
                'name' => $card->name,
                'pitch' => $card->pitch,
                'collector_number' => $card->printings->first()?->collector_number,
                'image_url' => $card->printings->first()?->image_url,
            ]);

        return response()->json($cards);
    }

    /**
     * Update a custom card.
     */
    public function update(Request $request, CustomCard $card): RedirectResponse
    {
        if ($card->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'linked_fab_card_id' => ['nullable', 'exists:fab_cards,id'],
            'types' => ['nullable', 'array'],
            'traits' => ['nullable', 'array'],
            'functional_text' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $card->update($validated);

        return back()->with('success', 'Karte aktualisiert.');
    }

    /**
     * Delete a custom card and all its printings.
     */
    public function destroy(CustomCard $card): RedirectResponse
    {
        if ($card->user_id !== Auth::id()) {
            abort(403);
        }

        // Delete all printings first (cascade should handle this, but being explicit)
        $card->printings()->delete();
        $card->delete();

        return back()->with('success', 'Karte gelöscht.');
    }

    /**
     * Add a new printing to an existing custom card.
     */
    public function addPrinting(Request $request, CustomCard $card): RedirectResponse
    {
        if ($card->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'set_name' => ['nullable', 'string', 'max:255'],
            'collector_number' => ['nullable', 'string', 'max:50'],
            'rarity' => ['nullable', 'string', 'max:20'],
            'foiling' => ['nullable', 'string', 'max:20'],
            'language' => ['nullable', 'string', 'max:10'],
            'edition' => ['nullable', 'string', 'max:20'],
        ]);

        CustomPrinting::create([
            'custom_card_id' => $card->id,
            'user_id' => Auth::id(),
            'set_name' => $validated['set_name'] ?? null,
            'collector_number' => $validated['collector_number'] ?? null,
            'rarity' => $validated['rarity'] ?? null,
            'foiling' => $validated['foiling'] ?? null,
            'language' => $validated['language'] ?? 'EN',
            'edition' => $validated['edition'] ?? null,
        ]);

        return back()->with('success', 'Printing hinzugefügt.');
    }

    /**
     * Delete a custom printing.
     */
    public function deletePrinting(CustomPrinting $printing): RedirectResponse
    {
        if ($printing->user_id !== Auth::id()) {
            abort(403);
        }

        // Delete the image file if it exists
        if ($printing->image_path) {
            \Storage::disk('public')->delete($printing->image_path);
        }

        $printing->delete();

        return back()->with('success', 'Printing gelöscht.');
    }

    /**
     * Update a custom printing.
     */
    public function updatePrinting(Request $request, CustomPrinting $printing): RedirectResponse
    {
        if ($printing->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'set_name' => ['nullable', 'string', 'max:255'],
            'collector_number' => ['nullable', 'string', 'max:50'],
            'rarity' => ['nullable', 'string', 'max:20'],
            'foiling' => ['nullable', 'string', 'max:20'],
            'language' => ['nullable', 'string', 'max:10'],
            'edition' => ['nullable', 'string', 'max:20'],
            'image' => ['nullable', 'image', 'max:5120'], // 5MB max
            'remove_image' => ['nullable', 'boolean'],
        ]);

        // Handle image removal
        if ($request->boolean('remove_image') && $printing->image_path) {
            \Storage::disk('public')->delete($printing->image_path);
            $printing->image_path = null;
        }

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($printing->image_path) {
                \Storage::disk('public')->delete($printing->image_path);
            }

            $path = $request->file('image')->store('custom-cards', 'public');
            $printing->image_path = $path;
        }

        $printing->fill([
            'set_name' => $validated['set_name'] ?? $printing->set_name,
            'collector_number' => $validated['collector_number'] ?? $printing->collector_number,
            'rarity' => $validated['rarity'] ?? $printing->rarity,
            'foiling' => $validated['foiling'] ?? $printing->foiling,
            'language' => $validated['language'] ?? $printing->language,
            'edition' => $validated['edition'] ?? $printing->edition,
        ]);

        $printing->save();

        return back()->with('success', 'Printing aktualisiert.');
    }

    /**
     * Search custom cards for the authenticated user.
     */
    public function search(int $gameId, string $query): JsonResponse
    {
        $userId = auth()->id();

        $cards = CustomCard::where('user_id', $userId)
            ->where('game_id', $gameId)
            ->where('name', 'like', "%{$query}%")
            ->with('printings')
            ->limit(20)
            ->get();

        $results = [];
        foreach ($cards as $card) {
            foreach ($card->printings as $printing) {
                $results[] = [
                    'id' => $printing->id,
                    'card_id' => $card->id,
                    'card_name' => $card->name,
                    'set_name' => $printing->set_name ?? 'Custom',
                    'collector_number' => ($printing->set_name ?? '').($printing->collector_number ?? '') ?: '-',
                    'rarity' => $printing->rarity,
                    'foiling' => $printing->foiling,
                    'is_custom' => true,
                ];
            }
        }

        return response()->json($results);
    }
}
