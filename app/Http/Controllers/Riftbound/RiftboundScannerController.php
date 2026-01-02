<?php

namespace App\Http\Controllers\Riftbound;

use App\Http\Controllers\Controller;
use App\Models\Box;
use App\Models\Lot;
use App\Models\Riftbound\RiftboundInventory;
use App\Models\Riftbound\RiftboundPrinting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class RiftboundScannerController extends Controller
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
        $scannerSettings = $user->riftbound_scanner_settings ?? [
            'bulkMode' => [
                'enabled' => false,
                'interval' => 3,
                'defaultCondition' => 'NM',
                'defaultFoiling' => null,
                'defaultLanguage' => 'EN',
            ],
        ];

        return Inertia::render('riftbound/scanner', [
            'lots' => $lots,
            'boxes' => $boxes,
            'conditions' => RiftboundInventory::CONDITIONS,
            'foilings' => RiftboundPrinting::FOILINGS,
            'searchResults' => $searchResults,
            'searchQuery' => $request->input('q', ''),
            'scannerSettings' => $scannerSettings,
        ]);
    }

    protected function search(string $query, int $limit = 20): array
    {
        $printings = RiftboundPrinting::query()
            ->with(['card', 'set'])
            ->where(function ($q) use ($query) {
                $q->whereHas('card', fn ($c) => $c->where('name', 'like', "%{$query}%"))
                    ->orWhere('collector_number', 'like', "%{$query}%");
            })
            ->limit($limit)
            ->get();

        return $printings->map(fn ($p) => [
            'id' => $p->id,
            'card_name' => $p->card->name,
            'set_name' => $p->set->name ?? $p->set->code,
            'collector_number' => $p->collector_number,
            'rarity' => $p->rarity,
            'rarity_label' => $p->rarity_label,
            'foiling' => $p->foiling,
            'foiling_label' => $p->foiling_label,
            'image_url' => $p->image_url,
        ])->values()->toArray();
    }

    public function confirm(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'riftbound_printing_id' => ['required', 'exists:riftbound_printings,id'],
            'condition' => ['required', 'string', 'in:'.implode(',', array_keys(RiftboundInventory::CONDITIONS))],
            'language' => ['nullable', 'string'],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $lot = Lot::findOrFail($validated['lot_id']);
        $this->authorize('view', $lot);

        $position = RiftboundInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        $inventoryItem = RiftboundInventory::create([
            'user_id' => Auth::id(),
            'lot_id' => $validated['lot_id'],
            'riftbound_printing_id' => $validated['riftbound_printing_id'],
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
            'lot_count' => RiftboundInventory::where('lot_id', $validated['lot_id'])->count(),
        ]);
    }

    public function confirmBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lot_id' => ['required', 'exists:lots,id'],
            'cards' => ['required', 'array', 'min:1'],
            'cards.*.riftbound_printing_id' => ['required', 'exists:riftbound_printings,id'],
            'cards.*.condition' => ['required', 'string', 'in:'.implode(',', array_keys(RiftboundInventory::CONDITIONS))],
            'cards.*.language' => ['nullable', 'string'],
            'cards.*.price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $lot = Lot::findOrFail($validated['lot_id']);
        $this->authorize('view', $lot);

        $position = RiftboundInventory::where('lot_id', $validated['lot_id'])->max('position_in_lot') ?? 0;

        foreach ($validated['cards'] as $card) {
            RiftboundInventory::create([
                'user_id' => Auth::id(),
                'lot_id' => $validated['lot_id'],
                'riftbound_printing_id' => $card['riftbound_printing_id'],
                'condition' => $card['condition'],
                'language' => $card['language'] ?? 'EN',
                'price' => $card['price'] ?? null,
                'position_in_lot' => ++$position,
            ]);
        }

        return response()->json([
            'success' => true,
            'count' => count($validated['cards']),
            'lot_count' => RiftboundInventory::where('lot_id', $validated['lot_id'])->count(),
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
            'bulkMode.defaultFoiling' => ['nullable', 'string'],
            'bulkMode.defaultLanguage' => ['nullable', 'string'],
        ]);

        $user = Auth::user();
        $currentSettings = $user->riftbound_scanner_settings ?? [];

        $user->riftbound_scanner_settings = array_merge($currentSettings, $validated);
        $user->save();

        return back();
    }

    public function getSettings(): JsonResponse
    {
        $user = Auth::user();

        $settings = $user->riftbound_scanner_settings ?? [
            'bulkMode' => [
                'enabled' => false,
                'interval' => 3,
                'defaultCondition' => 'NM',
                'defaultFoiling' => null,
                'defaultLanguage' => 'EN',
            ],
        ];

        return response()->json(['settings' => $settings]);
    }
}
