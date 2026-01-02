<?php

namespace App\Models\Fab;

use App\Models\Game;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FabSet extends Model
{
    use HasFactory;

    protected $fillable = [
        'game_id',
        'external_id',
        'name',
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'released_at' => 'date',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function cards(): HasMany
    {
        return $this->hasMany(FabCard::class);
    }

    public function printings(): HasMany
    {
        return $this->hasMany(FabPrinting::class);
    }
}
