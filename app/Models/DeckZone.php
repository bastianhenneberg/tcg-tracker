<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeckZone extends Model
{
    protected $fillable = [
        'game_format_id',
        'slug',
        'name',
        'min_cards',
        'max_cards',
        'is_required',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'min_cards' => 'integer',
            'max_cards' => 'integer',
            'is_required' => 'boolean',
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
}
