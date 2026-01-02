<?php

namespace App\Http\Controllers\Op;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessInventoryAction;
use App\Models\Box;
use App\Models\Lot;
use App\Models\Op\OpInventory;
use App\Models\Op\OpPrinting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class OpScannerController extends Controller
{
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

        // Search results
        $searchResults = [];
        if ($request->filled('q') && strlen($request->input('q')) >= 2) {
            $searchResults = $this->search($request->input('q'), 20);
        }

        // User scanner settings
        $scannerSettings = $user->op_scanner_settings ?? [
            'bulkMode' => [
                'enabled' => false,
                'interval' => 3,
                'defaultCondition' => 'NM',
                'defaultLanguage' => 'EN',
            ],
        ];

        return Inertia::render('op/scanner', [
            'lots' => $lots,
            'boxes' => $boxes,
            'conditions' => OpInventory::CONDITIONS,
            'languages' => OpPrinting::LANGUAGES,
            'searchResults' => $searchResults,
            'searchQuery' => $request->input('q', ''),
            'scannerSettings' => $scannerSettings,
        ]);
    }

    private function search(string $query, int $limit = 20): array
    {
        return OpPrinting::with(['card', 'set'])
            ->where(function ($q) use ($query) {
                $q->whereHas('card', fn ($c) => $c->where('name', 'like', "%{$query}%"))
                    ->orWhere('collector_number', 'like', "%{$query}%")
                    ->orWhere('external_id', 'like', "%{$query}%");
            })
            ->limit($limit)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'card_name' => $p->card->name,
                'card_type' => $p->card->card_type,
                'color' => $p->card->color,
                'set_name' => $p->set->name ?? $p->set->external_id,
                'collector_number' => $p->collector_number,
                'rarity' => $p->rarity,
                'rarity_label' => $p->rarity_label,
                'is_alternate_art' => $p->is_alternate_art,
                'image_url' => $p->image_url,
            ])
            ->values()
            ->toArray();
    }

    public function confirm(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'op_printing_id' => ['required', 'exists:op_printings,id'],
            'condition' => ['required', 'string', 'in:'.implode(',', array_keys(OpInventory::CONDITIONS))],
            'language' => ['nullable', 'string', 'in:'.implode(',', array_keys(OpInventory::LANGUAGES))],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $lot = Lot::findOrFail($validated['lot_id']);
        $this->authorize('view', $lot);

        $position = OpInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        $inventoryItem = OpInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $validated['lot_id'],
            'op_printing_id' => $validated['op_printing_id'],
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
            ],
            'lot_count' => OpInventory::where('lot_id', $validated['lot_id'])->count(),
        ]);
    }

    public function confirmBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'cards' => ['required', 'array', 'min:1'],
            'cards.*.op_printing_id' => ['required', 'exists:op_printings,id'],
            'cards.*.condition' => ['required', 'string', 'in:'.implode(',', array_keys(OpInventory::CONDITIONS))],
            'cards.*.language' => ['nullable', 'string', 'in:'.implode(',', array_keys(OpInventory::LANGUAGES))],
            'cards.*.price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $lot = Lot::findOrFail($validated['lot_id']);
        $this->authorize('view', $lot);

        $cards = collect($validated['cards'])->map(fn ($card) => [
            'lot_id' => $validated['lot_id'],
            'op_printing_id' => $card['op_printing_id'],
            'condition' => $card['condition'],
            'language' => $card['language'] ?? 'EN',
            'price' => $card['price'] ?? null,
        ])->toArray();

        // Use queue for more than 3 cards
        if (count($cards) > 3) {
            ProcessInventoryAction::dispatch(
                Auth::id(),
                'confirm_op_cards',
                ['cards' => $cards]
            );

            return response()->json([
                'success' => true,
                'queued' => true,
                'message' => count($cards).' Karte(n) werden im Hintergrund hinzugefügt.',
            ]);
        }

        // Sync processing for small batches
        $position = OpInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        foreach ($cards as $card) {
            OpInventory::create([
                'user_id' => Auth::id(),
                'lot_id' => $card['lot_id'],
                'op_printing_id' => $card['op_printing_id'],
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
            'lot_count' => OpInventory::where('lot_id', $validated['lot_id'])->count(),
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
            'bulkMode' => ['nullable', 'array'],
            'bulkMode.enabled' => ['nullable', 'boolean'],
            'bulkMode.interval' => ['nullable', 'integer', 'min:1', 'max:30'],
            'bulkMode.defaultCondition' => ['nullable', 'string'],
            'bulkMode.defaultLanguage' => ['nullable', 'string', 'in:'.implode(',', array_keys(OpPrinting::LANGUAGES))],
        ]);

        $user = Auth::user();
        $currentSettings = $user->op_scanner_settings ?? [];

        $user->op_scanner_settings = array_merge($currentSettings, $validated);
        $user->save();

        return back();
    }

    public function getSettings(): JsonResponse
    {
        $user = Auth::user();

        $settings = $user->op_scanner_settings ?? [
            'bulkMode' => [
                'enabled' => false,
                'interval' => 3,
                'defaultCondition' => 'NM',
                'defaultLanguage' => 'EN',
            ],
        ];

        return response()->json(['settings' => $settings]);
    }
}
