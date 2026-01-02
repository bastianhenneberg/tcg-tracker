<?php

namespace App\Models\Op;

use App\Models\Lot;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpInventory extends Model
{
    use HasFactory;

    protected $table = 'op_inventory';

    public const CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DMG' => 'Damaged',
    ];

    public const LANGUAGES = [
        'EN' => 'English',
        'JP' => 'Japanese',
    ];

    protected $fillable = [
        'user_id',
        'lot_id',
        'op_printing_id',
        'condition',
        'language',
        'price',
        'position_in_lot',
        'sold_at',
        'sold_price',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'sold_at' => 'datetime',
            'sold_price' => 'decimal:2',
        ];
    }

    // Relationships

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo(OpPrinting::class, 'op_printing_id');
    }

    // Scopes

    public function scopeUnsold(Builder $query): Builder
    {
        return $query->whereNull('sold_at');
    }

    public function scopeSold(Builder $query): Builder
    {
        return $query->whereNotNull('sold_at');
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    // Helpers

    public function getConditionLabelAttribute(): string
    {
        return self::CONDITIONS[$this->condition] ?? $this->condition ?? 'Unknown';
    }

    public static function getConditionLabel(?string $condition): string
    {
        return self::CONDITIONS[$condition] ?? $condition ?? 'Unknown';
    }

    public function isSold(): bool
    {
        return $this->sold_at !== null;
    }

    public function isAvailable(): bool
    {
        return $this->sold_at === null;
    }

    public function markAsSold(?float $price = null): void
    {
        $this->update([
            'sold_at' => now(),
            'sold_price' => $price ?? $this->price,
        ]);
    }

    /**
     * Renumber positions in a lot after items are removed.
     */
    public static function renumberPositionsInLot(int $lotId): void
    {
        $items = self::where('lot_id', $lotId)
            ->orderBy('position_in_lot')
            ->get();

        $position = 1;
        foreach ($items as $item) {
            if ($item->position_in_lot !== $position) {
                $item->update(['position_in_lot' => $position]);
            }
            $position++;
        }
    }
}
