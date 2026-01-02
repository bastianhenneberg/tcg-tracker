<?php

namespace App\Models\Mtg;

use App\Models\Lot;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MtgInventory extends Model
{
    use HasFactory;

    protected $table = 'mtg_inventory';

    protected $fillable = [
        'user_id',
        'lot_id',
        'mtg_printing_id',
        'condition',
        'finish',
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
            'sold_price' => 'decimal:2',
            'sold_at' => 'datetime',
            'position_in_lot' => 'integer',
        ];
    }

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
        return $this->belongsTo(MtgPrinting::class, 'mtg_printing_id');
    }

    /**
     * Mark this inventory item as sold.
     */
    public function markAsSold(?float $soldPrice = null): void
    {
        $this->update([
            'sold_at' => now(),
            'sold_price' => $soldPrice ?? $this->price,
        ]);
    }

    /**
     * Scope query to unsold items.
     */
    public function scopeUnsold($query)
    {
        return $query->whereNull('sold_at');
    }

    /**
     * Scope query to sold items.
     */
    public function scopeSold($query)
    {
        return $query->whereNotNull('sold_at');
    }
}
