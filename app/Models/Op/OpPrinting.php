<?php

namespace App\Models\Op;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OpPrinting extends Model
{
    use HasFactory;

    public const RARITIES = [
        'L' => 'Leader',
        'C' => 'Common',
        'UC' => 'Uncommon',
        'R' => 'Rare',
        'SR' => 'Super Rare',
        'SEC' => 'Secret Rare',
        'SP' => 'Special',
        'P' => 'Promo',
    ];

    public const LANGUAGES = [
        'EN' => 'English',
        'JP' => 'Japanese',
    ];

    protected $fillable = [
        'op_card_id',
        'op_set_id',
        'external_id',
        'collector_number',
        'rarity',
        'is_alternate_art',
        'language',
        'image_url',
    ];

    protected function casts(): array
    {
        return [
            'is_alternate_art' => 'boolean',
        ];
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(OpCard::class, 'op_card_id');
    }

    public function set(): BelongsTo
    {
        return $this->belongsTo(OpSet::class, 'op_set_id');
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(OpInventory::class);
    }

    public function collectionItems(): HasMany
    {
        return $this->hasMany(OpCollection::class);
    }

    // Label Accessors

    public function getRarityLabelAttribute(): string
    {
        return self::RARITIES[$this->rarity] ?? $this->rarity ?? 'Unknown';
    }

    public function getLanguageLabelAttribute(): string
    {
        return self::LANGUAGES[$this->language] ?? $this->language ?? 'English';
    }

    // Static Helpers

    public static function getRarityLabel(?string $rarity): string
    {
        return self::RARITIES[$rarity] ?? $rarity ?? 'Unknown';
    }

    public static function getLanguageLabel(?string $language): string
    {
        return self::LANGUAGES[$language] ?? $language ?? 'English';
    }
}
