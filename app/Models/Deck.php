<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Deck extends Model
{
    /** @use HasFactory<\Database\Factories\DeckFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'game_format_id',
        'name',
        'description',
        'is_public',
        'use_collection_only',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
            'use_collection_only' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gameFormat(): BelongsTo
    {
        return $this->belongsTo(GameFormat::class);
    }

    public function cards(): HasMany
    {
        return $this->hasMany(DeckCard::class);
    }

    public function zones(): HasManyThrough
    {
        return $this->hasManyThrough(
            DeckZone::class,
            DeckCard::class,
            'deck_id',
            'id',
            'id',
            'deck_zone_id'
        )->distinct();
    }

    public function getCardCount(): int
    {
        return $this->cards()->sum('quantity');
    }

    public function getGame(): ?Game
    {
        return $this->gameFormat?->game;
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    public function scopeForGame($query, string $gameSlug)
    {
        return $query->whereHas('gameFormat.game', fn ($q) => $q->where('slug', $gameSlug));
    }
}
