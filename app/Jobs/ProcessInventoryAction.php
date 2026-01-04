<?php

namespace App\Jobs;

use App\Models\UnifiedInventory;
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
        $gameSlug = $this->data['game'] ?? 'fab';
        $count = 0;

        foreach ($cards as $card) {
            $lotId = $card['lot_id'];
            $position = UnifiedInventory::where('lot_id', $lotId)->max('extra->position_in_lot') ?? 0;

            UnifiedInventory::create([
                'user_id' => $user->id,
                'lot_id' => $lotId,
                'printing_id' => $card['printing_id'],
                'condition' => $card['condition'],
                'language' => $card['language'] ?? 'EN',
                'quantity' => 1,
                'in_collection' => false,
                'extra' => [
                    'position_in_lot' => $position + 1,
                    'price' => $card['price'] ?? null,
                ],
            ]);

            $count++;
        }

        $user->notify(new InventoryActionCompleted(
            action: 'confirm_cards',
            message: "{$count} Karte(n) zum Inventar hinzugefügt",
            url: "/g/{$gameSlug}/inventory",
            meta: ['count' => $count]
        ));
    }

    protected function markSold(User $user): void
    {
        $ids = $this->data['ids'] ?? [];
        $soldPrice = $this->data['sold_price'] ?? null;
        $gameSlug = $this->data['game'] ?? 'fab';

        $items = UnifiedInventory::whereIn('id', $ids)
            ->where('user_id', $user->id)
            ->get();

        $count = 0;
        foreach ($items as $item) {
            $extra = $item->extra ?? [];
            $extra['sold_at'] = now()->toIso8601String();
            $extra['sold_price'] = $soldPrice ?? ($extra['price'] ?? null);
            $item->update(['extra' => $extra]);
            $count++;
        }

        $user->notify(new InventoryActionCompleted(
            action: 'mark_sold',
            message: "{$count} Karte(n) als verkauft markiert",
            url: "/g/{$gameSlug}/inventory",
            meta: ['count' => $count]
        ));
    }

    protected function moveToCollection(User $user): void
    {
        $ids = $this->data['ids'] ?? [];
        $gameSlug = $this->data['game'] ?? 'fab';
        $count = 0;

        DB::transaction(function () use ($ids, $user, &$count) {
            $items = UnifiedInventory::whereIn('id', $ids)
                ->where('user_id', $user->id)
                ->with('printing')
                ->get();

            foreach ($items as $item) {
                // Check if already in collection with same printing, condition, language
                $existing = UnifiedInventory::where('user_id', $user->id)
                    ->where('printing_id', $item->printing_id)
                    ->where('condition', $item->condition)
                    ->where('language', $item->language ?? 'EN')
                    ->where('in_collection', true)
                    ->first();

                if ($existing) {
                    $existing->increment('quantity');
                    $item->delete();
                } else {
                    // Convert to collection item
                    $item->update([
                        'in_collection' => true,
                        'quantity' => 1,
                    ]);
                }

                $count++;
            }
        });

        $user->notify(new InventoryActionCompleted(
            action: 'move_to_collection',
            message: "{$count} Karte(n) in Sammlung verschoben",
            url: "/g/{$gameSlug}/collection",
            meta: ['count' => $count]
        ));
    }

    protected function deleteCards(User $user): void
    {
        $ids = $this->data['ids'] ?? [];
        $gameSlug = $this->data['game'] ?? 'fab';

        $count = UnifiedInventory::whereIn('id', $ids)
            ->where('user_id', $user->id)
            ->delete();

        $user->notify(new InventoryActionCompleted(
            action: 'delete_cards',
            message: "{$count} Karte(n) gelöscht",
            url: "/g/{$gameSlug}/inventory",
            meta: ['count' => $count]
        ));
    }
}
