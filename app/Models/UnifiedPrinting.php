<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnifiedPrinting extends Model
{
    use HasFactory;

    /**
     * Standard finishes/foilings used across games.
     * Games may have additional game-specific finishes in game_specific field.
     */
    public const FINISHES = [
        'nonfoil' => 'Standard',
        'foil' => 'Foil',
        'cold_foil' => 'Cold Foil',
        'rainbow_foil' => 'Rainbow Foil',
        'etched' => 'Etched',
        'textured' => 'Textured',
        'extended_art' => 'Extended Art',
        'full_art' => 'Full Art',
        'alternate_art' => 'Alternate Art',
    ];

    /**
     * Game-specific finish mappings for backwards compatibility.
     */
    public const GAME_FINISHES = [
        'fab' => [
            'S' => 'Standard',
            'R' => 'Rainbow Foil',
            'C' => 'Cold Foil',
            'G' => 'Gold Cold Foil',
        ],
        'mtg' => [
            'nonfoil' => 'Non-Foil',
            'foil' => 'Foil',
            'etched' => 'Etched',
        ],
        'riftbound' => [
            'standard' => 'Standard',
            'holofoil' => 'Holofoil',
            'fullart' => 'Full Art',
        ],
    ];

    protected $fillable = [
        'card_id',
        'set_id',
        'set_code',
        'set_name',
        'collector_number',
        'rarity',
        'rarity_label',
        'finish',
        'finish_label',
        'language',
        'flavor_text',
        'artist',
        'image_url',
        'image_url_small',
        'image_url_back',
        'is_promo',
        'is_reprint',
        'is_variant',
        'released_at',
        'prices',
        'game_specific',
        'external_ids',
    ];

    protected function casts(): array
    {
        return [
            'released_at' => 'date',
            'is_promo' => 'boolean',
            'is_reprint' => 'boolean',
            'is_variant' => 'boolean',
            'prices' => 'array',
            'game_specific' => 'array',
            'external_ids' => 'array',
        ];
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(UnifiedCard::class, 'card_id');
    }

    public function set(): BelongsTo
    {
        return $this->belongsTo(UnifiedSet::class, 'set_id');
    }

    public function inventories(): HasMany
    {
        return $this->hasMany(UnifiedInventory::class, 'printing_id');
    }

    public function scopeForGame($query, string $game)
    {
        return $query->whereHas('card', fn ($q) => $q->where('game', $game));
    }

    public function scopeInSet($query, string $setCode)
    {
        return $query->where('set_code', $setCode);
    }

    public function getDisplayNameAttribute(): string
    {
        $parts = [$this->card->name];

        if ($this->set_code) {
            $parts[] = "({$this->set_code} #{$this->collector_number})";
        }

        if ($this->finish_label) {
            $parts[] = "- {$this->finish_label}";
        }

        return implode(' ', $parts);
    }
}
