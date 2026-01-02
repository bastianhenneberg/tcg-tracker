<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\GameAttribute;
use App\Models\GameFormat;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class GameController extends Controller
{
    public function index(): Response
    {
        $games = Game::query()
            ->where(function ($query) {
                $query->where('is_official', true)
                    ->orWhere('user_id', Auth::id());
            })
            ->withCount(['fabCards', 'formats', 'attributes'])
            ->orderBy('is_official', 'desc')
            ->orderBy('name')
            ->get();

        return Inertia::render('settings/games', [
            'games' => $games,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $slug = Str::slug($validated['name']);

        // Ensure unique slug for user
        $baseSlug = $slug;
        $counter = 1;
        while (Game::where('slug', $slug)->where('user_id', Auth::id())->exists()) {
            $slug = $baseSlug.'-'.$counter++;
        }

        $game = Game::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'is_official' => false,
            'user_id' => Auth::id(),
        ]);

        // Create default conditions (same for all games)
        $this->createDefaultConditions($game);

        return back()->with('success', 'Spiel erstellt');
    }

    public function update(Request $request, Game $game): RedirectResponse
    {
        $this->authorize('update', $game);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $game->update($validated);

        return back()->with('success', 'Spiel aktualisiert');
    }

    public function destroy(Game $game): RedirectResponse
    {
        $this->authorize('delete', $game);

        $game->delete();

        return back()->with('success', 'Spiel gelöscht');
    }

    public function show(Game $game): Response
    {
        $this->authorize('view', $game);

        $game->load(['attributes' => function ($query) {
            $query->orderBy('type')->orderBy('sort_order');
        }, 'formats' => function ($query) {
            $query->orderBy('sort_order');
        }]);

        $attributeTypes = [
            GameAttribute::TYPE_RARITY => 'Seltenheiten',
            GameAttribute::TYPE_FOILING => 'Foiling',
            GameAttribute::TYPE_LANGUAGE => 'Sprachen',
            GameAttribute::TYPE_EDITION => 'Editionen',
            GameAttribute::TYPE_CONDITION => 'Zustand',
        ];

        return Inertia::render('settings/games/show', [
            'game' => $game,
            'attributeTypes' => $attributeTypes,
        ]);
    }

    public function storeAttribute(Request $request, Game $game): RedirectResponse
    {
        $this->authorize('update', $game);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:rarity,foiling,language,edition,condition'],
            'key' => ['required', 'string', 'max:50'],
            'label' => ['required', 'string', 'max:255'],
        ]);

        $maxOrder = $game->attributes()->where('type', $validated['type'])->max('sort_order') ?? -1;

        GameAttribute::create([
            'game_id' => $game->id,
            'type' => $validated['type'],
            'key' => $validated['key'],
            'label' => $validated['label'],
            'sort_order' => $maxOrder + 1,
        ]);

        return back();
    }

    public function destroyAttribute(Game $game, GameAttribute $attribute): RedirectResponse
    {
        $this->authorize('update', $game);

        if ($attribute->game_id !== $game->id) {
            abort(403);
        }

        $attribute->delete();

        return back();
    }

    public function storeFormat(Request $request, Game $game): RedirectResponse
    {
        $this->authorize('update', $game);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $slug = Str::slug($validated['name']);
        $maxOrder = $game->formats()->max('sort_order') ?? -1;

        GameFormat::create([
            'game_id' => $game->id,
            'slug' => $slug,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => true,
            'sort_order' => $maxOrder + 1,
        ]);

        return back();
    }

    public function destroyFormat(Game $game, GameFormat $format): RedirectResponse
    {
        $this->authorize('update', $game);

        if ($format->game_id !== $game->id) {
            abort(403);
        }

        $format->delete();

        return back();
    }

    private function createDefaultConditions(Game $game): void
    {
        $conditions = [
            'NM' => 'Near Mint',
            'LP' => 'Lightly Played',
            'MP' => 'Moderately Played',
            'HP' => 'Heavily Played',
            'DM' => 'Damaged',
        ];

        $sortOrder = 0;
        foreach ($conditions as $key => $label) {
            GameAttribute::create([
                'game_id' => $game->id,
                'type' => GameAttribute::TYPE_CONDITION,
                'key' => $key,
                'label' => $label,
                'sort_order' => $sortOrder++,
            ]);
        }
    }
}
