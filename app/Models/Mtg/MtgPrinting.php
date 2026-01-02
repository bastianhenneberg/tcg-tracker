<?php

namespace App\Models\Mtg;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MtgPrinting extends Model
{
    use HasFactory;

    protected $fillable = [
        'mtg_card_id',
        'mtg_set_id',
        'uuid',
        'scryfall_id',
        'multiverse_id',
        'number',
        'rarity',
        'artist',
        'flavor_text',
        'watermark',
        'border_color',
        'frame_version',
        'finishes',
        'has_foil',
        'has_non_foil',
        'is_promo',
        'is_full_art',
        'is_textless',
        'is_oversized',
        'availability',
        'tcgplayer_product_id',
        'cardmarket_id',
        'mtgo_id',
        'arena_id',
        'image_url',
    ];

    protected function casts(): array
    {
        return [
            'finishes' => 'array',
            'availability' => 'array',
            'has_foil' => 'boolean',
            'has_non_foil' => 'boolean',
            'is_promo' => 'boolean',
            'is_full_art' => 'boolean',
            'is_textless' => 'boolean',
            'is_oversized' => 'boolean',
        ];
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(MtgCard::class, 'mtg_card_id');
    }

    public function set(): BelongsTo
    {
        return $this->belongsTo(MtgSet::class, 'mtg_set_id');
    }

    public function collection(): HasMany
    {
        return $this->hasMany(MtgCollection::class);
    }

    public function inventory(): HasMany
    {
        return $this->hasMany(MtgInventory::class);
    }

    /**
     * Get the Scryfall image URL for this printing.
     */
    public function getScryfallImageUrl(string $size = 'normal'): ?string
    {
        if (! $this->scryfall_id) {
            return null;
        }

        // Scryfall image URL format
        // https://cards.scryfall.io/{size}/front/{a}/{b}/{scryfall_id}.jpg
        $a = substr($this->scryfall_id, 0, 1);
        $b = substr($this->scryfall_id, 1, 1);

        return "https://cards.scryfall.io/{$size}/front/{$a}/{$b}/{$this->scryfall_id}.jpg";
    }

    /**
     * Get all available finishes for this printing.
     */
    public function getAvailableFinishes(): array
    {
        return $this->finishes ?? ($this->has_foil && $this->has_non_foil ? ['nonfoil', 'foil'] : ($this->has_foil ? ['foil'] : ['nonfoil']));
    }
}
