<?php

namespace App\Models\Fab;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FabPrinting extends Model
{
    use HasFactory;

    public const RARITIES = [
        'C' => 'Common',
        'R' => 'Rare',
        'S' => 'Super Rare',
        'M' => 'Majestic',
        'L' => 'Legendary',
        'F' => 'Fabled',
        'P' => 'Promo',
        'T' => 'Token',
    ];

    public const FOILINGS = [
        'S' => 'Standard',
        'R' => 'Rainbow Foil',
        'C' => 'Cold Foil',
        'G' => 'Gold Cold Foil',
    ];

    public const LANGUAGES = [
        'EN' => 'English',
        'DE' => 'Deutsch',
        'FR' => 'Français',
        'ES' => 'Español',
        'IT' => 'Italiano',
        'JP' => 'Japanese',
        'CN' => 'Chinese',
        'KR' => 'Korean',
    ];

    public const EDITIONS = [
        'A' => 'Alpha',
        'F' => 'First Edition',
        'N' => 'Normal',
        'U' => 'Unlimited',
    ];

    protected $fillable = [
        'fab_card_id',
        'fab_set_id',
        'external_id',
        'collector_number',
        'rarity',
        'foiling',
        'language',
        'edition',
        'image_url',
        'artists',
        'flavor_text',
        'flavor_text_plain',
        'tcgplayer_product_id',
        'tcgplayer_url',
    ];

    protected function casts(): array
    {
        return [
            'artists' => 'array',
        ];
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(FabCard::class, 'fab_card_id');
    }

    public function set(): BelongsTo
    {
        return $this->belongsTo(FabSet::class, 'fab_set_id');
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(FabInventory::class);
    }

    public function collectionItems(): HasMany
    {
        return $this->hasMany(FabCollection::class);
    }

    // Label Helpers

    public function getRarityLabelAttribute(): string
    {
        return self::RARITIES[$this->rarity] ?? $this->rarity ?? 'Unknown';
    }

    public function getFoilingLabelAttribute(): string
    {
        return self::FOILINGS[$this->foiling] ?? $this->foiling ?? 'Standard';
    }

    public function getLanguageLabelAttribute(): string
    {
        return self::LANGUAGES[$this->language] ?? $this->language ?? 'English';
    }

    public function getEditionLabelAttribute(): string
    {
        return self::EDITIONS[$this->edition] ?? $this->edition ?? 'Normal';
    }

    // Static Helpers

    public static function getRarityLabel(?string $rarity): string
    {
        return self::RARITIES[$rarity] ?? $rarity ?? 'Unknown';
    }

    public static function getFoilingLabel(?string $foiling): string
    {
        return self::FOILINGS[$foiling] ?? $foiling ?? 'Standard';
    }

    public static function getLanguageLabel(?string $language): string
    {
        return self::LANGUAGES[$language] ?? $language ?? 'English';
    }

    public static function getEditionLabel(?string $edition): string
    {
        return self::EDITIONS[$edition] ?? $edition ?? 'Normal';
    }
}
