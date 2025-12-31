<?php

namespace App\Jobs;

use App\Models\Fab\FabCollection;
use App\Models\Fab\FabInventory;
use App\Models\User;
use App\Notifications\InventoryActionCompleted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class ProcessInventoryAction implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $userId,
        public string $action,
        public array $data
    ) {}

    public function handle(): void
    {
        $user = User::find($this->userId);
        if (! $user) {
            return;
        }

        match ($this->action) {
            'confirm_cards' => $this->confirmCards($user),
            'mark_sold' => $this->markSold($user),
            'move_to_collection' => $this->moveToCollection($user),
            'delete_cards' => $this->deleteCards($user),
            default => null,
        };
    }

    protected function confirmCards(User $user): void
    {
        $cards = $this->data['cards'] ?? [];
        $count = 0;

        foreach ($cards as $card) {
            $lotId = $card['lot_id'];
            $position = FabInventory::where('lot_id', $lotId)->max('position_in_lot') ?? 0;

            FabInventory::create([
                'user_id' => $user->id,
                'lot_id' => $lotId,
                'fab_printing_id' => $card['fab_printing_id'],
                'condition' => $card['condition'],
                'language' => $card['language'] ?? 'EN',
                'price' => $card['price'] ?? null,
                'position_in_lot' => $position + 1,
            ]);

            $count++;
        }

        $user->notify(new InventoryActionCompleted(
            action: 'confirm_cards',
            message: "{$count} Karte(n) zum Inventar hinzugefügt",
            url: '/fab/inventory',
            meta: ['count' => $count]
        ));
    }

    protected function markSold(User $user): void
    {
        $ids = $this->data['ids'] ?? [];
        $soldPrice = $this->data['sold_price'] ?? null;

        $items = FabInventory::whereIn('id', $ids)
            ->where('user_id', $user->id)
            ->get();

        $count = 0;
        foreach ($items as $item) {
            $item->update([
                'sold_at' => now(),
                'sold_price' => $soldPrice ?? $item->price,
            ]);
            $count++;
        }

        $user->notify(new InventoryActionCompleted(
            action: 'mark_sold',
            message: "{$count} Karte(n) als verkauft markiert",
            url: '/fab/inventory',
            meta: ['count' => $count]
        ));
    }

    protected function moveToCollection(User $user): void
    {
        $ids = $this->data['ids'] ?? [];

        $affectedLotIds = [];
        $count = 0;

        DB::transaction(function () use ($ids, $user, &$affectedLotIds, &$count) {
            $items = FabInventory::whereIn('id', $ids)
                ->where('user_id', $user->id)
                ->with('printing')
                ->get();

            $affectedLotIds = $items->pluck('lot_id')->unique()->filter()->toArray();

            foreach ($items as $item) {
                $existing = FabCollection::where('user_id', $user->id)
                    ->where('fab_printing_id', $item->fab_printing_id)
                    ->where('condition', $item->condition)
                    ->where('language', $item->language ?? 'EN')
                    ->first();

                if ($existing) {
                    $existing->increment('quantity');
                } else {
                    FabCollection::create([
                        'user_id' => $user->id,
                        'fab_printing_id' => $item->fab_printing_id,
                        'condition' => $item->condition,
                        'language' => $item->language ?? 'EN',
                        'quantity' => 1,
                        'source_lot_id' => $item->lot_id,
                    ]);
                }

                $item->delete();
                $count++;
            }
        });

        foreach ($affectedLotIds as $lotId) {
            FabInventory::renumberPositionsInLot($lotId);
        }

        $user->notify(new InventoryActionCompleted(
            action: 'move_to_collection',
            message: "{$count} Karte(n) in Sammlung verschoben",
            url: '/fab/collection',
            meta: ['count' => $count]
        ));
    }

    protected function deleteCards(User $user): void
    {
        $ids = $this->data['ids'] ?? [];

        $affectedLotIds = FabInventory::whereIn('id', $ids)
            ->where('user_id', $user->id)
            ->pluck('lot_id')
            ->unique()
            ->filter()
            ->toArray();

        $count = FabInventory::whereIn('id', $ids)
            ->where('user_id', $user->id)
            ->delete();

        foreach ($affectedLotIds as $lotId) {
            FabInventory::renumberPositionsInLot($lotId);
        }

        $user->notify(new InventoryActionCompleted(
            action: 'delete_cards',
            message: "{$count} Karte(n) gelöscht",
            url: '/fab/inventory',
            meta: ['count' => $count]
        ));
    }
}
