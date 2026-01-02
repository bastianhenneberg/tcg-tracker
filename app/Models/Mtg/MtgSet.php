<?php

namespace App\Models\Mtg;

use App\Models\Game;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MtgSet extends Model
{
    use HasFactory;

    protected $fillable = [
        'game_id',
        'code',
        'name',
        'type',
        'release_date',
        'base_set_size',
        'total_set_size',
        'is_foil_only',
        'is_online_only',
        'keyrune_code',
        'mtgo_code',
        'tcgplayer_group_id',
        'mcm_id',
        'mcm_name',
        'languages',
        'translations',
    ];

    protected function casts(): array
    {
        return [
            'release_date' => 'date',
            'is_foil_only' => 'boolean',
            'is_online_only' => 'boolean',
            'languages' => 'array',
            'translations' => 'array',
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

    public function cards(): HasMany
    {
        return $this->hasManyThrough(MtgCard::class, MtgPrinting::class);
    }
}
