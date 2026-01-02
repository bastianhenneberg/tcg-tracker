<?php

namespace App\Http\Controllers\Mtg;

use App\Http\Controllers\Controller;
use App\Models\Box;
use App\Models\Lot;
use App\Models\Mtg\MtgInventory;
use App\Services\Mtg\MtgCardMatcherService;
use App\Services\OllamaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MtgScannerController extends Controller
{
    public const CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DM' => 'Damaged',
    ];

    public const FINISHES = [
        'nonfoil' => 'Non-Foil',
        'foil' => 'Foil',
        'etched' => 'Etched Foil',
    ];

    public function __construct(
        protected OllamaService $ollamaService,
        protected MtgCardMatcherService $cardMatcherService
    ) {}

    public function index(Request $request): Response
    {
        $user = Auth::user();

        $lots = Lot::where('user_id', $user->id)
            ->with('box')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $boxes = Box::where('user_id', $user->id)
            ->orderBy('name')
            ->get();

        $ollamaStatus = $this->ollamaService->getStatus();

        // Search results
        $searchResults = [];
        if ($request->filled('q') && strlen($request->input('q')) >= 2) {
            $searchResults = $this->cardMatcherService->search($request->input('q'), 20)->values()->toArray();
        }

        // User scanner settings
        $scannerSettings = $user->mtg_scanner_settings ?? [
            'bulkMode' => [
                'enabled' => false,
                'interval' => 3,
                'defaultCondition' => 'NM',
                'defaultFinish' => 'nonfoil',
                'defaultLanguage' => 'en',
            ],
        ];

        return Inertia::render('mtg/scanner', [
            'lots' => $lots,
            'boxes' => $boxes,
            'ollamaStatus' => $ollamaStatus,
            'conditions' => self::CONDITIONS,
            'finishes' => self::FINISHES,
            'searchResults' => $searchResults,
            'searchQuery' => $request->input('q', ''),
            'scannerSettings' => $scannerSettings,
        ]);
    }

    public function search(Request $request): Response|array
    {
        $query = $request->input('q', '');
        $results = $this->cardMatcherService->search($query, 20)->values()->toArray();

        if ($request->wantsJson()) {
            return response()->json($results);
        }

        return Inertia::render('mtg/scanner', [
            'searchResults' => $results,
            'searchQuery' => $query,
        ]);
    }

    public function recognize(Request $request): RedirectResponse
    {
        \Log::info('MTG Scanner recognize called');

        $request->validate([
            'image' => ['required', 'string'],
        ]);

        $base64Image = $request->input('image');

        if (str_contains($base64Image, ',')) {
            $base64Image = explode(',', $base64Image)[1];
        }

        \Log::info('Calling Ollama service for MTG...');
        $recognition = $this->ollamaService->recognizeMtgCard($base64Image);
        \Log::info('Ollama MTG result:', $recognition);

        if (! $recognition['success']) {
            return back()->with('scanner', [
                'success' => false,
                'error' => $recognition['error'] ?? 'Recognition failed',
            ]);
        }

        $matchResult = $this->cardMatcherService->findMatch($recognition['data']);

        $matchData = null;
        if ($matchResult['match']) {
            $printing = $matchResult['match'];
            $matchData = [
                'id' => $printing->id,
                'card_name' => $printing->card->name,
                'set_name' => $printing->set->name,
                'set_code' => $printing->set->code,
                'number' => $printing->number,
                'rarity' => $printing->rarity,
                'image_url' => $printing->image_url,
                'has_foil' => $printing->has_foil,
                'has_non_foil' => $printing->has_non_foil,
            ];
        }

        return back()->with('scanner', [
            'success' => true,
            'recognition' => $recognition['data'],
            'match' => $matchData,
            'confidence' => $matchResult['confidence'],
            'alternatives' => $matchResult['alternatives']->map(fn ($p) => [
                'id' => $p->id,
                'card_name' => $p->card->name,
                'set_name' => $p->set->name,
                'set_code' => $p->set->code,
                'number' => $p->number,
                'rarity' => $p->rarity,
                'image_url' => $p->image_url,
                'has_foil' => $p->has_foil,
                'has_non_foil' => $p->has_non_foil,
            ])->values()->toArray(),
        ]);
    }

    public function confirm(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'mtg_printing_id' => ['required', 'exists:mtg_printings,id'],
            'condition' => ['required', 'string', 'in:'.implode(',', array_keys(self::CONDITIONS))],
            'finish' => ['required', 'string', 'in:'.implode(',', array_keys(self::FINISHES))],
            'language' => ['nullable', 'string'],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        // Verify lot belongs to user
        $lot = Lot::findOrFail($validated['lot_id']);
        if ($lot->user_id !== Auth::id()) {
            abort(403, 'Lot gehört nicht dir');
        }

        $position = MtgInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        $inventoryItem = MtgInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $validated['lot_id'],
            'mtg_printing_id' => $validated['mtg_printing_id'],
            'condition' => $validated['condition'],
            'finish' => $validated['finish'],
            'language' => $validated['language'] ?? 'en',
            'price' => $validated['price'] ?? null,
            'position_in_lot' => $position + 1,
        ]);

        $inventoryItem->load('printing.card');

        return back()->with('scanner', [
            'success' => true,
            'confirmed' => [
                'id' => $inventoryItem->id,
                'card_name' => $inventoryItem->printing->card->name,
                'position' => $inventoryItem->position_in_lot,
                'condition' => $inventoryItem->condition,
            ],
            'lot_count' => MtgInventory::where('lot_id', $validated['lot_id'])->count(),
        ]);
    }

    public function confirmBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'cards' => ['required', 'array', 'min:1'],
            'cards.*.mtg_printing_id' => ['required', 'exists:mtg_printings,id'],
            'cards.*.condition' => ['required', 'string', 'in:'.implode(',', array_keys(self::CONDITIONS))],
            'cards.*.finish' => ['required', 'string', 'in:'.implode(',', array_keys(self::FINISHES))],
            'cards.*.language' => ['nullable', 'string'],
        ]);

        // Verify lot belongs to user
        $lot = Lot::findOrFail($validated['lot_id']);
        if ($lot->user_id !== Auth::id()) {
            abort(403, 'Lot gehört nicht dir');
        }

        $position = MtgInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        foreach ($validated['cards'] as $card) {
            MtgInventory::create([
                'user_id' => Auth::id(),
                'lot_id' => $validated['lot_id'],
                'mtg_printing_id' => $card['mtg_printing_id'],
                'condition' => $card['condition'],
                'finish' => $card['finish'],
                'language' => $card['language'] ?? 'en',
                'position_in_lot' => ++$position,
            ]);
        }

        return response()->json([
            'success' => true,
            'count' => count($validated['cards']),
            'lot_count' => MtgInventory::where('lot_id', $validated['lot_id'])->count(),
        ]);
    }

    public function createLot(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'box_id' => ['nullable', 'exists:boxes,id'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        // Verify box belongs to user if provided
        if (isset($validated['box_id'])) {
            $box = Box::findOrFail($validated['box_id']);
            if ($box->user_id !== Auth::id()) {
                abort(403, 'Box gehört nicht dir');
            }
        }

        $nextLotNumber = Lot::where('user_id', Auth::id())->max('lot_number') + 1;

        $lot = Lot::create([
            'user_id' => Auth::id(),
            'box_id' => $validated['box_id'] ?? null,
            'lot_number' => $nextLotNumber,
            'notes' => $validated['notes'] ?? null,
        ]);

        $lot->load('box');

        return back()->with('scanner', [
            'success' => true,
            'newLot' => [
                'id' => $lot->id,
                'lot_number' => $lot->lot_number,
                'box_name' => $lot->box?->name,
                'created_at' => $lot->created_at->format('d.m.Y H:i'),
            ],
        ]);
    }

    public function saveSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'bulkMode' => ['nullable', 'array'],
            'bulkMode.enabled' => ['nullable', 'boolean'],
            'bulkMode.interval' => ['nullable', 'integer', 'min:1', 'max:30'],
            'bulkMode.defaultCondition' => ['nullable', 'string'],
            'bulkMode.defaultFinish' => ['nullable', 'string'],
            'bulkMode.defaultLanguage' => ['nullable', 'string'],
        ]);

        $user = Auth::user();
        $currentSettings = $user->mtg_scanner_settings ?? [];

        $user->mtg_scanner_settings = array_merge($currentSettings, $validated);
        $user->save();

        return back();
    }

    public function getSettings(): JsonResponse
    {
        $user = Auth::user();

        $settings = $user->mtg_scanner_settings ?? [
            'bulkMode' => [
                'enabled' => false,
                'interval' => 3,
                'defaultCondition' => 'NM',
                'defaultFinish' => 'nonfoil',
                'defaultLanguage' => 'en',
            ],
        ];

        return response()->json(['settings' => $settings]);
    }
}
