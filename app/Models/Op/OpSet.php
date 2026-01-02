<?php

namespace App\Models\Op;

use App\Models\Game;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OpSet extends Model
{
    use HasFactory;

    protected $fillable = [
        'game_id',
        'external_id',
        'name',
        'type',
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

    public function printings(): HasMany
    {
        return $this->hasMany(OpPrinting::class);
    }
}
