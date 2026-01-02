<?php

namespace App\Models\Op;

use App\Models\Game;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OpCard extends Model
{
    use HasFactory;

    public const CARD_TYPES = [
        'Leader' => 'Leader',
        'Character' => 'Character',
        'Event' => 'Event',
        'Stage' => 'Stage',
    ];

    public const COLORS = [
        'Red' => 'Red',
        'Green' => 'Green',
        'Blue' => 'Blue',
        'Purple' => 'Purple',
        'Black' => 'Black',
        'Yellow' => 'Yellow',
    ];

    public const ATTRIBUTES = [
        'Slash' => 'Slash',
        'Strike' => 'Strike',
        'Ranged' => 'Ranged',
        'Special' => 'Special',
        'Wisdom' => 'Wisdom',
    ];

    protected $fillable = [
        'game_id',
        'external_id',
        'name',
        'card_type',
        'color',
        'color_secondary',
        'cost',
        'power',
        'life',
        'counter',
        'attribute',
        'types',
        'effect',
        'trigger',
    ];

    protected function casts(): array
    {
        return [
            'cost' => 'integer',
            'power' => 'integer',
            'life' => 'integer',
            'counter' => 'integer',
            'types' => 'array',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function printings(): HasMany
    {
        return $this->hasMany(OpPrinting::class);
    }

    // Scopes

    public function scopeByCardType(Builder $query, string $type): Builder
    {
        return $query->where('card_type', $type);
    }

    public function scopeByColor(Builder $query, string $color): Builder
    {
        return $query->where(function ($q) use ($color) {
            $q->where('color', $color)
                ->orWhere('color_secondary', $color);
        });
    }

    public function scopeByAttribute(Builder $query, string $attribute): Builder
    {
        return $query->where('attribute', $attribute);
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->whereJsonContains('types', $type);
    }

    // Helpers

    public function isDualColor(): bool
    {
        return $this->color_secondary !== null;
    }

    public function getColorsAttribute(): array
    {
        $colors = [$this->color];
        if ($this->color_secondary) {
            $colors[] = $this->color_secondary;
        }

        return $colors;
    }
}
