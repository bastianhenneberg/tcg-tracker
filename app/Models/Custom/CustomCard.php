<?php

namespace App\Models\Custom;

use App\Models\Fab\FabCard;
use App\Models\Game;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'game_id',
        'linked_fab_card_id',
        'name',
        'external_id',
        'attributes',
        'types',
        'traits',
        'card_keywords',
        'functional_text',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'attributes' => 'array',
            'types' => 'array',
            'traits' => 'array',
            'card_keywords' => 'array',
        ];
    }

    // Relationships

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * The main FaB card this custom card is a variant of (e.g., German translation).
     */
    public function linkedFabCard(): BelongsTo
    {
        return $this->belongsTo(FabCard::class, 'linked_fab_card_id');
    }

    public function printings(): HasMany
    {
        return $this->hasMany(CustomPrinting::class);
    }

    // Scopes

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForGame(Builder $query, int $gameId): Builder
    {
        return $query->where('game_id', $gameId);
    }

    public function scopeByName(Builder $query, string $name): Builder
    {
        return $query->where('name', 'like', "%{$name}%");
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->whereJsonContains('types', $type);
    }

    public function scopeByTrait(Builder $query, string $trait): Builder
    {
        return $query->whereJsonContains('traits', $trait);
    }

    // Helpers

    /**
     * Get a specific attribute from the attributes JSON column.
     */
    public function getCardAttribute(string $key, mixed $default = null): mixed
    {
        $attributes = $this->attributes['attributes'] ?? [];
        if (is_string($attributes)) {
            $attributes = json_decode($attributes, true) ?? [];
        }

        return $attributes[$key] ?? $default;
    }
}
