<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\PlaysetRule;
use App\Services\PlaysetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PlaysetRuleController extends Controller
{
    public function __construct(
        private PlaysetService $playsetService
    ) {}

    public function index(Request $request): Response
    {
        $userId = Auth::id();
        $games = Game::with(['formats' => fn ($q) => $q->active()->orderBy('sort_order')])->get();

        $selectedGameId = $request->input('game', $games->first()?->id);
        $selectedGame = $games->firstWhere('id', $selectedGameId);

        $selectedFormatId = $request->input('format', $selectedGame?->formats->first()?->id);

        // Ensure default rules exist
        if ($selectedFormatId) {
            $this->playsetService->createDefaultRulesForUser($userId, (int) $selectedFormatId);
        }

        $rules = $selectedFormatId
            ? PlaysetRule::where('user_id', $userId)
                ->where('game_format_id', $selectedFormatId)
                ->orderByDesc('priority')
                ->get()
            : collect();

        return Inertia::render('settings/playset-rules', [
            'games' => $games,
            'selectedGameId' => $selectedGameId,
            'selectedFormatId' => $selectedFormatId,
            'rules' => $rules,
            'conditionFields' => [
                'rarity' => 'Seltenheit',
                'types' => 'Kartentyp',
                'traits' => 'Merkmal',
            ],
            'operators' => [
                'equals' => 'ist gleich',
                'not_equals' => 'ist nicht gleich',
                'contains' => 'enthält',
                'not_contains' => 'enthält nicht',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'game_format_id' => ['required', 'exists:game_formats,id'],
            'name' => ['required', 'string', 'max:100'],
            'max_copies' => ['required', 'integer', 'min:0', 'max:99'],
            'priority' => ['required', 'integer', 'min:0', 'max:100'],
            'conditions' => ['nullable', 'array'],
        ]);

        PlaysetRule::create([
            'user_id' => Auth::id(),
            'game_format_id' => $validated['game_format_id'],
            'name' => $validated['name'],
            'max_copies' => $validated['max_copies'],
            'priority' => $validated['priority'],
            'conditions' => $validated['conditions'] ?? [],
        ]);

        return back()->with('success', 'Regel erstellt.');
    }

    public function update(Request $request, PlaysetRule $rule): RedirectResponse
    {
        $this->authorize('update', $rule);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'max_copies' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'priority' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'conditions' => ['sometimes', 'array'],
        ]);

        $rule->update($validated);

        return back()->with('success', 'Regel aktualisiert.');
    }

    public function destroy(PlaysetRule $rule): RedirectResponse
    {
        $this->authorize('delete', $rule);

        $rule->delete();

        return back()->with('success', 'Regel gelöscht.');
    }

    public function resetDefaults(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'game_format_id' => ['required', 'exists:game_formats,id'],
        ]);

        $userId = Auth::id();
        $formatId = $validated['game_format_id'];

        // Delete existing rules
        PlaysetRule::where('user_id', $userId)
            ->where('game_format_id', $formatId)
            ->delete();

        // Recreate defaults
        $this->playsetService->createDefaultRulesForUser($userId, $formatId);

        return back()->with('success', 'Regeln auf Standard zurückgesetzt.');
    }
}
