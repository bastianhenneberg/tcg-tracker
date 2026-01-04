<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lot extends Model
{
    /** @use HasFactory<\Database\Factories\LotFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'box_id',
        'lot_number',
        'card_range_start',
        'card_range_end',
        'scanned_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'scanned_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function box(): BelongsTo
    {
        return $this->belongsTo(Box::class);
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(UnifiedInventory::class);
    }

    public function getTotalCardCountAttribute(): int
    {
        return $this->inventory_items_count ?? $this->inventoryItems()->count();
    }

    public static function nextLotNumber(int $userId): int
    {
        $maxLotNumber = static::where('user_id', $userId)->max('lot_number');

        return ($maxLotNumber ?? 0) + 1;
    }
}
