<?php

namespace App\Models\Mtg;

use App\Models\Lot;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MtgCollection extends Model
{
    use HasFactory;

    protected $table = 'mtg_collection';

    protected $fillable = [
        'user_id',
        'mtg_printing_id',
        'condition',
        'finish',
        'language',
        'quantity',
        'notes',
        'source_lot_id',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo(MtgPrinting::class, 'mtg_printing_id');
    }

    public function sourceLot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'source_lot_id');
    }
}
