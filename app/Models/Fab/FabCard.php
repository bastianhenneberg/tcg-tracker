<?php

namespace App\Models\Fab;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FabCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'external_id',
        'name',
        'pitch',
        'cost',
        'power',
        'defense',
        'health',
        'intelligence',
        'arcane',
        'types',
        'traits',
        'card_keywords',
        'abilities_and_effects',
        'functional_text',
        'functional_text_plain',
        'type_text',
        'played_horizontally',
        'blitz_legal',
        'cc_legal',
        'commoner_legal',
        'll_legal',
    ];

    protected function casts(): array
    {
        return [
            'pitch' => 'integer',
            'health' => 'integer',
            'intelligence' => 'integer',
            'arcane' => 'integer',
            'types' => 'array',
            'traits' => 'array',
            'card_keywords' => 'array',
            'abilities_and_effects' => 'array',
            'played_horizontally' => 'boolean',
            'blitz_legal' => 'boolean',
            'cc_legal' => 'boolean',
            'commoner_legal' => 'boolean',
            'll_legal' => 'boolean',
        ];
    }

    public function printings(): HasMany
    {
        return $this->hasMany(FabPrinting::class);
    }

    // Scopes

    public function scopeLegal(Builder $query, string $format): Builder
    {
        return match ($format) {
            'blitz' => $query->where('blitz_legal', true),
            'cc' => $query->where('cc_legal', true),
            'commoner' => $query->where('commoner_legal', true),
            'll' => $query->where('ll_legal', true),
            default => $query,
        };
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->whereJsonContains('types', $type);
    }

    public function scopeByPitch(Builder $query, int $pitch): Builder
    {
        return $query->where('pitch', $pitch);
    }

    public function scopeByTrait(Builder $query, string $trait): Builder
    {
        return $query->whereJsonContains('traits', $trait);
    }

    // Helpers

    public function getPitchColorAttribute(): ?string
    {
        return match ($this->pitch) {
            1 => 'red',
            2 => 'yellow',
            3 => 'blue',
            default => null,
        };
    }
}
