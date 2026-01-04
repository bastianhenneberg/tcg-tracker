<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnifiedSet extends Model
{
    protected $fillable = [
        'game',
        'code',
        'name',
        'set_type',
        'released_at',
        'card_count',
        'icon_url',
        'game_specific',
        'external_ids',
    ];

    protected function casts(): array
    {
        return [
            'released_at' => 'date',
            'card_count' => 'integer',
            'game_specific' => 'array',
            'external_ids' => 'array',
        ];
    }

    public function printings(): HasMany
    {
        return $this->hasMany(UnifiedPrinting::class, 'set_id');
    }

    public function scopeForGame($query, string $game)
    {
        return $query->where('game', $game);
    }
}
