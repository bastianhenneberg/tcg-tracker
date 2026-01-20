<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeckCard extends Model
{
    /** @use HasFactory<\Database\Factories\DeckCardFactory> */
    use HasFactory;

    protected $fillable = [
        'deck_id',
        'deck_zone_id',
        'printing_id',
        'quantity',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'position' => 'integer',
        ];
    }

    public function deck(): BelongsTo
    {
        return $this->belongsTo(Deck::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(DeckZone::class, 'deck_zone_id');
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo(UnifiedPrinting::class, 'printing_id');
    }

    public function scopeInZone($query, string $zoneSlug)
    {
        return $query->whereHas('zone', fn ($q) => $q->where('slug', $zoneSlug));
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('position');
    }
}
