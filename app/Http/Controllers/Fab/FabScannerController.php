<?php

namespace App\Http\Controllers\Fab;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessInventoryAction;
use App\Models\Box;
use App\Models\Custom\CustomInventory;
use App\Models\Custom\CustomPrinting;
use App\Models\Fab\FabInventory;
use App\Models\Fab\FabPrinting;
use App\Models\Lot;
use App\Services\Fab\FabCardMatcherService;
use App\Services\OllamaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FabScannerController extends Controller
{
    public function __construct(
        protected OllamaService $ollamaService,
        protected FabCardMatcherService $cardMatcherService
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

        // Search results als Prop (already mapped in service)
        $searchResults = [];
        if ($request->filled('q') && strlen($request->input('q')) >= 2) {
            $searchResults = $this->cardMatcherService->search($request->input('q'), 20)->values();
        }

        // User scanner settings
        $scannerSettings = $user->scanner_settings ?? [
            'template' => null,
            'bulkMode' => [
                'enabled' => false,
                'interval' => 3,
                'defaultCondition' => 'NM',
                'defaultFoiling' => null,
                'defaultLanguage' => 'EN',
            ],
        ];

        // Ensure defaultLanguage exists for backwards compatibility
        if (! isset($scannerSettings['bulkMode']['defaultLanguage'])) {
            $scannerSettings['bulkMode']['defaultLanguage'] = 'EN';
        }

        // Load inventory items for the first lot (or selected lot)
        $selectedLotId = $request->input('lot_id', $lots->first()?->id);
        $lotInventory = [];
        if ($selectedLotId) {
            $lotInventory = FabInventory::where('lot_id', $selectedLotId)
                ->with('printing.card')
                ->orderByDesc('position_in_lot')
                ->get()
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'card_name' => $item->printing->card->name,
                    'position' => $item->position_in_lot,
                    'condition' => $item->condition,
                    'is_custom' => false,
                ])
                ->values();

            // Also load custom inventory items
            $customInventory = CustomInventory::where('lot_id', $selectedLotId)
                ->with('printing.card')
                ->orderByDesc('position_in_lot')
                ->get()
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'card_name' => $item->printing->card->name,
                    'position' => $item->position_in_lot,
                    'condition' => $item->condition,
                    'is_custom' => true,
                ]);

            $lotInventory = $lotInventory->concat($customInventory)->sortByDesc('position')->values();
        }

        return Inertia::render('fab/scanner', [
            'lots' => $lots,
            'boxes' => $boxes,
            'ollamaStatus' => $ollamaStatus,
            'conditions' => FabInventory::CONDITIONS,
            'foilings' => FabPrinting::FOILINGS,
            'searchResults' => $searchResults,
            'searchQuery' => $request->input('q', ''),
            'scannerSettings' => $scannerSettings,
            'lotInventory' => $lotInventory,
            'selectedLotId' => $selectedLotId,
        ]);
    }

    public function recognize(Request $request): RedirectResponse
    {
        \Log::info('Scanner recognize called');

        $request->validate([
            'image' => ['required', 'string'],
        ]);

        $base64Image = $request->input('image');

        if (str_contains($base64Image, ',')) {
            $base64Image = explode(',', $base64Image)[1];
        }

        \Log::info('Calling Ollama service...');
        $recognition = $this->ollamaService->recognizeCard($base64Image);
        \Log::info('Ollama result:', $recognition);

        if (! $recognition['success']) {
            return back()->with('scanner', [
                'success' => false,
                'error' => $recognition['error'] ?? 'Recognition failed',
            ]);
        }

        $matchResult = $this->cardMatcherService->findMatch($recognition['data']);

        $matchData = null;
        if ($matchResult['match']) {
            if ($matchResult['is_custom']) {
                // Custom card printing
                $printing = $matchResult['match'];
                // Image priority: custom > parent > null
                $imageUrl = $printing->image_url ?? $printing->card->linkedFabCard?->printings?->first()?->image_url;
                // Combine set + number for collector number (e.g., "2HP" + "454" = "2HP454")
                $collectorNumber = ($printing->set_name ?? '').($printing->collector_number ?? '');
                $matchData = [
                    'id' => $printing->id,
                    'card_name' => $printing->card->name,
                    'set_name' => $printing->set_name ?? 'Custom',
                    'collector_number' => $collectorNumber ?: '-',
                    'rarity' => $printing->rarity,
                    'rarity_label' => $printing->rarity ? FabPrinting::RARITIES[$printing->rarity] ?? $printing->rarity : null,
                    'foiling' => $printing->foiling,
                    'foiling_label' => $printing->foiling ? FabPrinting::FOILINGS[$printing->foiling] ?? $printing->foiling : null,
                    'image_url' => $imageUrl,
                    'is_custom' => true,
                ];
            } else {
                // Regular FAB printing
                $printing = $matchResult['match'];
                $matchData = [
                    'id' => $printing->id,
                    'card_name' => $printing->card->name,
                    'set_name' => $printing->set->name ?? $printing->set->external_id,
                    'collector_number' => $printing->collector_number,
                    'rarity' => $printing->rarity,
                    'rarity_label' => $printing->rarity_label,
                    'foiling' => $printing->foiling,
                    'foiling_label' => $printing->foiling_label,
                    'image_url' => $printing->image_url,
                    'is_custom' => false,
                ];
            }
        }

        return back()->with('scanner', [
            'success' => true,
            'recognition' => $recognition['data'],
            'match' => $matchData,
            'confidence' => $matchResult['confidence'],
            'alternatives' => $matchResult['alternatives']->map(fn ($p) => [
                'id' => $p->id,
                'card_name' => $p->card->name,
                'set_name' => $p->set->name ?? $p->set->external_id,
                'collector_number' => $p->collector_number,
                'rarity' => $p->rarity,
                'rarity_label' => $p->rarity_label,
                'foiling' => $p->foiling,
                'foiling_label' => $p->foiling_label,
                'image_url' => $p->image_url,
            ])->values()->toArray(),
        ]);
    }

    public function confirm(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'fab_printing_id' => ['nullable', 'exists:fab_printings,id', 'required_without:custom_printing_id'],
            'custom_printing_id' => ['nullable', 'exists:custom_printings,id', 'required_without:fab_printing_id'],
            'is_custom' => ['nullable', 'boolean'],
            'condition' => ['required', 'string', 'in:'.implode(',', array_keys(FabInventory::CONDITIONS))],
            'language' => ['nullable', 'string', 'in:'.implode(',', array_keys(FabInventory::LANGUAGES))],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $lot = Lot::findOrFail($validated['lot_id']);
        $this->authorize('view', $lot);

        $isCustom = $validated['is_custom'] ?? ! empty($validated['custom_printing_id']);

        if ($isCustom) {
            // Custom card inventory
            $customPrinting = CustomPrinting::where('id', $validated['custom_printing_id'])
                ->where('user_id', Auth::id())
                ->firstOrFail();

            $position = CustomInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

            $inventoryItem = CustomInventory::create([
                'user_id' => Auth::id(),
                'lot_id' => $validated['lot_id'],
                'custom_printing_id' => $customPrinting->id,
                'condition' => $validated['condition'],
                'language' => $validated['language'] ?? 'EN',
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
                    'is_custom' => true,
                ],
                'lot_count' => CustomInventory::where('lot_id', $validated['lot_id'])->count(),
            ]);
        }

        // Regular FAB inventory
        $position = FabInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        $inventoryItem = FabInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $validated['lot_id'],
            'fab_printing_id' => $validated['fab_printing_id'],
            'condition' => $validated['condition'],
            'language' => $validated['language'] ?? 'EN',
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
                'is_custom' => false,
            ],
            'lot_count' => FabInventory::where('lot_id', $validated['lot_id'])->count(),
        ]);
    }

    public function confirmBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'cards' => ['required', 'array', 'min:1'],
            'cards.*.fab_printing_id' => ['required', 'exists:fab_printings,id'],
            'cards.*.condition' => ['required', 'string', 'in:'.implode(',', array_keys(FabInventory::CONDITIONS))],
            'cards.*.language' => ['nullable', 'string', 'in:'.implode(',', array_keys(FabInventory::LANGUAGES))],
            'cards.*.price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $lot = Lot::findOrFail($validated['lot_id']);
        $this->authorize('view', $lot);

        $cards = collect($validated['cards'])->map(fn ($card) => [
            'lot_id' => $validated['lot_id'],
            'fab_printing_id' => $card['fab_printing_id'],
            'condition' => $card['condition'],
            'language' => $card['language'] ?? 'EN',
            'price' => $card['price'] ?? null,
        ])->toArray();

        // Use queue for more than 3 cards
        if (count($cards) > 3) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'confirm_cards',
                ['cards' => $cards]
            );

            return response()->json([
                'success' => true,
                'queued' => true,
                'message' => count($cards).' Karte(n) werden im Hintergrund hinzugefügt.',
            ]);
        }

        // Sync processing for small batches
        $position = FabInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        foreach ($cards as $card) {
            FabInventory::create([
                'user_id' => Auth::id(),
                'lot_id' => $card['lot_id'],
                'fab_printing_id' => $card['fab_printing_id'],
                'condition' => $card['condition'],
                'language' => $card['language'],
                'price' => $card['price'],
                'position_in_lot' => ++$position,
            ]);
        }

        return response()->json([
            'success' => true,
            'queued' => false,
            'count' => count($cards),
            'lot_count' => FabInventory::where('lot_id', $validated['lot_id'])->count(),
        ]);
    }

    public function createLot(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'box_id' => ['nullable', 'exists:boxes,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $boxId = $validated['box_id'] ?? null;

        if ($boxId) {
            $box = Box::findOrFail($boxId);
            $this->authorize('view', $box);
        }

        $lot = Lot::create([
            'user_id' => Auth::id(),
            'box_id' => $boxId,
            'lot_number' => Lot::nextLotNumber(Auth::id()),
            'scanned_at' => now(),
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
            'template' => ['nullable', 'array'],
            'template.referenceImage' => ['nullable', 'string'],
            'template.regions' => ['nullable', 'array'],
            'template.regions.cardName' => ['nullable', 'array'],
            'template.regions.setCode' => ['nullable', 'array'],
            'template.regions.collectorNumber' => ['nullable', 'array'],
            'bulkMode' => ['nullable', 'array'],
            'bulkMode.enabled' => ['nullable', 'boolean'],
            'bulkMode.interval' => ['nullable', 'integer', 'min:1', 'max:30'],
            'bulkMode.defaultCondition' => ['nullable', 'string'],
            'bulkMode.defaultFoiling' => ['nullable', 'string'],
            'bulkMode.defaultLanguage' => ['nullable', 'string', 'in:'.implode(',', array_keys(FabPrinting::LANGUAGES))],
        ]);

        $user = Auth::user();
        $currentSettings = $user->scanner_settings ?? [];

        $user->scanner_settings = array_merge($currentSettings, $validated);
        $user->save();

        return back();
    }

    public function getSettings(): JsonResponse
    {
        $user = Auth::user();

        $settings = $user->scanner_settings ?? [
            'template' => null,
            'bulkMode' => [
                'enabled' => false,
                'interval' => 3,
                'defaultCondition' => 'NM',
                'defaultFoiling' => null,
                'defaultLanguage' => 'EN',
            ],
        ];

        // Ensure defaultLanguage exists for backwards compatibility
        if (! isset($settings['bulkMode']['defaultLanguage'])) {
            $settings['bulkMode']['defaultLanguage'] = 'EN';
        }

        return response()->json(['settings' => $settings]);
    }
}
