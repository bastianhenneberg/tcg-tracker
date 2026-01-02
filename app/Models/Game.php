<?php

namespace App\Models;

use App\Models\Fab\FabCard;
use App\Models\Fab\FabSet;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Game extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'description',
        'logo_url',
        'is_official',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'is_official' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attributes(): HasMany
    {
        return $this->hasMany(GameAttribute::class);
    }

    public function formats(): HasMany
    {
        return $this->hasMany(GameFormat::class);
    }

    public function fabCards(): HasMany
    {
        return $this->hasMany(FabCard::class);
    }

    public function fabSets(): HasMany
    {
        return $this->hasMany(FabSet::class);
    }

    // Helper methods to get attributes by type

    public function rarities(): HasMany
    {
        return $this->attributes()->where('type', 'rarity')->orderBy('sort_order');
    }

    public function foilings(): HasMany
    {
        return $this->attributes()->where('type', 'foiling')->orderBy('sort_order');
    }

    public function conditions(): HasMany
    {
        return $this->attributes()->where('type', 'condition')->orderBy('sort_order');
    }

    public function languages(): HasMany
    {
        return $this->attributes()->where('type', 'language')->orderBy('sort_order');
    }

    public function editions(): HasMany
    {
        return $this->attributes()->where('type', 'edition')->orderBy('sort_order');
    }

    // Scopes

    public function scopeOfficial($query)
    {
        return $query->where('is_official', true);
    }

    public function scopeCustom($query)
    {
        return $query->where('is_official', false);
    }

    // Attribute getters as key => label arrays

    /**
     * Get conditions as key => label array.
     *
     * @return array<string, string>
     */
    public function getConditions(): array
    {
        return $this->conditions()->pluck('label', 'key')->toArray();
    }

    /**
     * Get rarities as key => label array.
     *
     * @return array<string, string>
     */
    public function getRarities(): array
    {
        return $this->rarities()->pluck('label', 'key')->toArray();
    }

    /**
     * Get foilings as key => label array.
     *
     * @return array<string, string>
     */
    public function getFoilings(): array
    {
        return $this->foilings()->pluck('label', 'key')->toArray();
    }

    /**
     * Get languages as key => label array.
     *
     * @return array<string, string>
     */
    public function getLanguages(): array
    {
        return $this->languages()->pluck('label', 'key')->toArray();
    }

    /**
     * Get editions as key => label array.
     *
     * @return array<string, string>
     */
    public function getEditions(): array
    {
        return $this->editions()->pluck('label', 'key')->toArray();
    }
}
