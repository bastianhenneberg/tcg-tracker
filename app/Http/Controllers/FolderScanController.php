<?php

namespace App\Http\Controllers;

use App\Jobs\ScanCardFolderJob;
use App\Models\Game;
use App\Models\Lot;
use App\Models\UnifiedInventory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class FolderScanController extends Controller
{
    /**
     * Games that support vision recognition (camera + folder scanner).
     */
    private const SCANNABLE_SLUGS = ['fab', 'mtg', 'magic-the-gathering', 'onepiece', 'riftbound'];

    private const DEFAULT_PATH = '/home/codingmachine/cards';

    public function index(): Response
    {
        $userId = Auth::id();

        $games = Game::query()
            ->where('is_official', true)
            ->whereIn('slug', self::SCANNABLE_SLUGS)
            ->orderBy('name')
            ->get(['id', 'slug', 'name']);

        $lots = Lot::query()
            ->where('user_id', $userId)
            ->orderByDesc('id')
            ->limit(100)
            ->get(['id', 'lot_number', 'box_id'])
            ->map(fn (Lot $lot) => [
                'id' => $lot->id,
                'label' => 'Lot #'.$lot->lot_number,
            ]);

        return Inertia::render('scanner/folder', [
            'games' => $games,
            'lots' => $lots,
            'defaultPath' => self::DEFAULT_PATH,
            'conditions' => UnifiedInventory::CONDITIONS,
            'languages' => UnifiedInventory::LANGUAGES,
            'scanStatus' => Cache::get(ScanCardFolderJob::statusKey($userId)),
        ]);
    }

    public function scan(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'game' => ['required', 'string'],
            'path' => ['required', 'string'],
            'lot_id' => ['required_if:dry_run,false', 'nullable', 'integer'],
            'condition' => ['required', 'string', 'in:'.implode(',', array_keys(UnifiedInventory::CONDITIONS))],
            'language' => ['required', 'string', 'in:'.implode(',', array_keys(UnifiedInventory::LANGUAGES))],
            'dry_run' => ['boolean'],
        ]);

        $userId = Auth::id();
        $game = Game::where('slug', $validated['game'])->firstOrFail();
        $dryRun = (bool) ($validated['dry_run'] ?? false);

        if (! is_dir($validated['path'])) {
            return back()->withErrors(['path' => "Ordner nicht gefunden: {$validated['path']}"]);
        }

        if (! $dryRun) {
            $lot = Lot::where('id', $validated['lot_id'])->where('user_id', $userId)->first();
            if (! $lot) {
                return back()->withErrors(['lot_id' => 'Bitte einen gültigen eigenen Lot wählen.']);
            }
        }

        Cache::put(ScanCardFolderJob::statusKey($userId), ['state' => 'queued', 'pages' => 0, 'matched' => 0, 'summary' => null], 3600);

        ScanCardFolderJob::dispatch(
            gameId: $game->id,
            path: $validated['path'],
            userId: $userId,
            lotId: (int) ($validated['lot_id'] ?? 0),
            condition: $validated['condition'],
            language: $validated['language'],
            dryRun: $dryRun,
        );

        return back()->with('success', 'Scan gestartet – läuft im Hintergrund.');
    }
}
