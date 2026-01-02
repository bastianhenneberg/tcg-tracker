<?php

namespace App\Models\Riftbound;

use App\Models\Lot;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiftboundInventory extends Model
{
    use HasFactory;

    protected $table = 'riftbound_inventory';

    protected $fillable = [
        'user_id',
        'lot_id',
        'riftbound_printing_id',
        'condition',
        'language',
        'price',
        'position_in_lot',
        'sold_at',
        'sold_price',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'sold_at' => 'datetime',
            'sold_price' => 'decimal:2',
        ];
    }

    // Condition constants
    public const CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DM' => 'Damaged',
    ];

    // Language constants
    public const LANGUAGES = [
        'EN' => 'English',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo(RiftboundPrinting::class, 'riftbound_printing_id');
    }

    public function markAsSold(?float $price = null): void
    {
        $this->update([
            'sold_at' => now(),
            'sold_price' => $price,
        ]);
    }

    public static function renumberPositionsInLot(int $lotId): void
    {
        $items = self::where('lot_id', $lotId)
            ->orderBy('position_in_lot')
            ->get();

        foreach ($items as $index => $item) {
            $item->update(['position_in_lot' => $index + 1]);
        }
    }
}
