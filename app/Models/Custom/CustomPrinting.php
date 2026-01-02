<?php

namespace App\Models\Custom;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomPrinting extends Model
{
    use HasFactory;

    protected $appends = ['image_url'];

    protected $fillable = [
        'custom_card_id',
        'user_id',
        'collector_number',
        'set_name',
        'rarity',
        'foiling',
        'language',
        'edition',
        'image_path',
        'notes',
    ];

    // Relationships

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(CustomCard::class, 'custom_card_id');
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(CustomInventory::class);
    }

    public function collectionItems(): HasMany
    {
        return $this->hasMany(CustomCollection::class);
    }

    // Scopes

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeBySet(Builder $query, string $setName): Builder
    {
        return $query->where('set_name', $setName);
    }

    public function scopeByRarity(Builder $query, string $rarity): Builder
    {
        return $query->where('rarity', $rarity);
    }

    // Accessors

    /**
     * Get the full URL for the custom image.
     */
    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image_path) {
            return null;
        }

        // If already a full URL, return as-is
        if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
            return $this->image_path;
        }

        return asset('storage/'.$this->image_path);
    }

    // Helpers

    public function getDisplayNameAttribute(): string
    {
        $parts = [$this->card?->name];

        if ($this->set_name) {
            $parts[] = "({$this->set_name})";
        }

        if ($this->collector_number) {
            $parts[] = "#{$this->collector_number}";
        }

        return implode(' ', array_filter($parts));
    }
}
