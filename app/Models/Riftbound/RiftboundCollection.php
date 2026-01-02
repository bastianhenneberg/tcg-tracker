<?php

namespace App\Models\Riftbound;

use App\Models\Lot;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiftboundCollection extends Model
{
    use HasFactory;

    protected $table = 'riftbound_collection';

    protected $fillable = [
        'user_id',
        'riftbound_printing_id',
        'condition',
        'language',
        'quantity',
        'notes',
        'source_lot_id',
    ];

    // Condition constants
    public const CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DM' => 'Damaged',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo(RiftboundPrinting::class, 'riftbound_printing_id');
    }

    public function sourceLot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'source_lot_id');
    }
}
