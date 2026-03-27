<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BinderPage extends Model
{
    /** @use HasFactory<\Database\Factories\BinderPageFactory> */
    use HasFactory;

    /**
     * Number of slots per page (3x3 grid).
     */
    public const SLOTS_PER_PAGE = 9;

    protected $fillable = [
        'user_id',
        'binder_id',
        'page_number',
        'notes',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function binder(): BelongsTo
    {
        return $this->belongsTo(Binder::class);
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(UnifiedInventory::class)->orderBy('binder_slot');
    }

    /**
     * Get the slots array (1-9) with their inventory items.
     *
     * @return array<int, UnifiedInventory|null>
     */
    public function getSlotsAttribute(): array
    {
        $items = $this->inventoryItems->keyBy('binder_slot');
        $slots = [];

        for ($i = 1; $i <= self::SLOTS_PER_PAGE; $i++) {
            $slots[$i] = $items->get($i);
        }

        return $slots;
    }

    public function getFilledSlotsCountAttribute(): int
    {
        return $this->inventory_items_count ?? $this->inventoryItems()->count();
    }

    public static function nextPageNumber(int $binderId): int
    {
        $maxPageNumber = static::where('binder_id', $binderId)->max('page_number');

        return ($maxPageNumber ?? 0) + 1;
    }
}
