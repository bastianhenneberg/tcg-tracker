<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeckZone extends Model
{
    /** @use HasFactory<\Database\Factories\DeckZoneFactory> */
    use HasFactory;

    protected $fillable = [
        'game_format_id',
        'slug',
        'name',
        'min_cards',
        'max_cards',
        'is_required',
        'counts_towards_deck',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'min_cards' => 'integer',
            'max_cards' => 'integer',
            'is_required' => 'boolean',
            'counts_towards_deck' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function gameFormat(): BelongsTo
    {
        return $this->belongsTo(GameFormat::class);
    }

    public function deckCards(): HasMany
    {
        return $this->hasMany(DeckCard::class);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }

    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }

    public function scopeCountingTowardsDeck($query)
    {
        return $query->where('counts_towards_deck', true);
    }
}
