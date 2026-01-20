<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeckInventoryAssignment extends Model
{
    protected $fillable = [
        'deck_id',
        'unified_inventory_id',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    public function deck(): BelongsTo
    {
        return $this->belongsTo(Deck::class);
    }

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(UnifiedInventory::class, 'unified_inventory_id');
    }
}
