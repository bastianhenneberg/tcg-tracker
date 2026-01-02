<?php

namespace App\Models\Riftbound;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RiftboundPrinting extends Model
{
    use HasFactory;

    protected $fillable = [
        'riftbound_card_id',
        'riftbound_set_id',
        'collector_number',
        'rarity',
        'foiling',
        'language',
        'image_url',
    ];

    // Rarity constants
    public const RARITIES = [
        'C' => 'Common',
        'U' => 'Uncommon',
        'R' => 'Rare',
        'E' => 'Epic',
        'O' => 'Overnumbered',
        'P' => 'Promo',
    ];

    // Foiling constants
    public const FOILINGS = [
        'N' => 'Non-Foil',
        'F' => 'Foil',
        'O' => 'Overnumbered Foil',
        'A' => 'Alternate Art',
    ];

    // Language constants
    public const LANGUAGES = [
        'EN' => 'English',
    ];

    public function card(): BelongsTo
    {
        return $this->belongsTo(RiftboundCard::class, 'riftbound_card_id');
    }

    public function set(): BelongsTo
    {
        return $this->belongsTo(RiftboundSet::class, 'riftbound_set_id');
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(RiftboundInventory::class);
    }

    public function collectionItems(): HasMany
    {
        return $this->hasMany(RiftboundCollection::class);
    }

    // Accessors

    public function getRarityLabelAttribute(): string
    {
        return self::RARITIES[$this->rarity] ?? $this->rarity ?? '-';
    }

    public function getFoilingLabelAttribute(): string
    {
        return self::FOILINGS[$this->foiling] ?? $this->foiling ?? 'Non-Foil';
    }
}
