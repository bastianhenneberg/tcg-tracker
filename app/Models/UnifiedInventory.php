<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnifiedInventory extends Model
{
    protected $fillable = [
        'user_id',
        'printing_id',
        'lot_id',
        'box_id',
        'quantity',
        'condition',
        'language',
        'notes',
        'purchase_price',
        'purchase_currency',
        'purchased_at',
        'in_collection',
        'extra',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'purchase_price' => 'decimal:2',
            'purchased_at' => 'date',
            'in_collection' => 'boolean',
            'extra' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo(UnifiedPrinting::class, 'printing_id');
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function box(): BelongsTo
    {
        return $this->belongsTo(Box::class);
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeInCollection($query)
    {
        return $query->where('in_collection', true);
    }

    public function scopeInInventory($query)
    {
        return $query->where('in_collection', false);
    }

    public function scopeForGame($query, string $game)
    {
        return $query->whereHas('printing.card', fn ($q) => $q->where('game', $game));
    }

    public function scopeInLot($query, int $lotId)
    {
        return $query->where('lot_id', $lotId);
    }
}
