<?php

namespace App\Models\Fab;

use App\Models\Game;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FabCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'game_id',
        'external_id',
        'name',
        'color',
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
        // Blitz
        'blitz_legal',
        'blitz_banned',
        'blitz_suspended',
        'blitz_living_legend',
        // Classic Constructed
        'cc_legal',
        'cc_banned',
        'cc_suspended',
        'cc_living_legend',
        // Commoner
        'commoner_legal',
        'commoner_banned',
        'commoner_suspended',
        // Living Legend
        'll_legal',
        'll_banned',
        'll_restricted',
        // Silver Age
        'silver_age_legal',
        'silver_age_banned',
        // Ultimate Pit Fight
        'upf_banned',
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
            // Blitz
            'blitz_legal' => 'boolean',
            'blitz_banned' => 'boolean',
            'blitz_suspended' => 'boolean',
            'blitz_living_legend' => 'boolean',
            // Classic Constructed
            'cc_legal' => 'boolean',
            'cc_banned' => 'boolean',
            'cc_suspended' => 'boolean',
            'cc_living_legend' => 'boolean',
            // Commoner
            'commoner_legal' => 'boolean',
            'commoner_banned' => 'boolean',
            'commoner_suspended' => 'boolean',
            // Living Legend
            'll_legal' => 'boolean',
            'll_banned' => 'boolean',
            'll_restricted' => 'boolean',
            // Silver Age
            'silver_age_legal' => 'boolean',
            'silver_age_banned' => 'boolean',
            // Ultimate Pit Fight
            'upf_banned' => 'boolean',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function printings(): HasMany
    {
        return $this->hasMany(FabPrinting::class);
    }

    // Scopes

    public function scopeLegal(Builder $query, string $format): Builder
    {
        return match ($format) {
            'blitz' => $query->where('blitz_legal', true)
                ->where('blitz_banned', false)
                ->where('blitz_suspended', false),
            'cc' => $query->where('cc_legal', true)
                ->where('cc_banned', false)
                ->where('cc_suspended', false),
            'commoner' => $query->where('commoner_legal', true)
                ->where('commoner_banned', false)
                ->where('commoner_suspended', false),
            'll' => $query->where('ll_legal', true)
                ->where('ll_banned', false),
            'silver_age' => $query->where('silver_age_legal', true)
                ->where('silver_age_banned', false),
            'upf' => $query->where('upf_banned', false),
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
