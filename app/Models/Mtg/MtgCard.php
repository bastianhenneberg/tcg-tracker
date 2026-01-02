<?php

namespace App\Models\Mtg;

use App\Models\Game;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MtgCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'game_id',
        'oracle_id',
        'name',
        'mana_cost',
        'mana_value',
        'type_line',
        'oracle_text',
        'power',
        'toughness',
        'loyalty',
        'defense',
        'colors',
        'color_identity',
        'types',
        'subtypes',
        'supertypes',
        'keywords',
        'layout',
        'legalities',
        'edhrec_rank',
    ];

    protected function casts(): array
    {
        return [
            'mana_value' => 'float',
            'colors' => 'array',
            'color_identity' => 'array',
            'types' => 'array',
            'subtypes' => 'array',
            'supertypes' => 'array',
            'keywords' => 'array',
            'legalities' => 'array',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function printings(): HasMany
    {
        return $this->hasMany(MtgPrinting::class);
    }

    /**
     * Check if the card is legal in a specific format.
     */
    public function isLegalIn(string $format): bool
    {
        return isset($this->legalities[$format]) && $this->legalities[$format] === 'Legal';
    }

    /**
     * Check if the card is restricted in a specific format.
     */
    public function isRestrictedIn(string $format): bool
    {
        return isset($this->legalities[$format]) && $this->legalities[$format] === 'Restricted';
    }

    /**
     * Check if the card is banned in a specific format.
     */
    public function isBannedIn(string $format): bool
    {
        return isset($this->legalities[$format]) && $this->legalities[$format] === 'Banned';
    }

    /**
     * Scope query to cards legal in a specific format.
     */
    public function scopeLegalIn($query, string $format)
    {
        return $query->whereJsonContains('legalities->'.$format, 'Legal');
    }
}
