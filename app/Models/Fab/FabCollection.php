<?php

namespace App\Models\Fab;

use App\Models\Lot;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FabCollection extends Model
{
    use HasFactory;

    protected $table = 'fab_collection';

    public const CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DMG' => 'Damaged',
    ];

    public const LANGUAGES = [
        'EN' => 'English',
        'DE' => 'German',
        'FR' => 'French',
        'ES' => 'Spanish',
        'IT' => 'Italian',
        'JP' => 'Japanese',
        'CN' => 'Chinese',
        'KR' => 'Korean',
    ];

    protected $fillable = [
        'user_id',
        'fab_printing_id',
        'condition',
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

    // Relationships

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo(FabPrinting::class, 'fab_printing_id');
    }

    public function sourceLot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'source_lot_id');
    }

    // Scopes

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByCondition(Builder $query, string $condition): Builder
    {
        return $query->where('condition', $condition);
    }

    // Helpers

    public function getConditionLabelAttribute(): string
    {
        return self::CONDITIONS[$this->condition] ?? $this->condition ?? 'Unknown';
    }

    public static function getConditionLabel(?string $condition): string
    {
        return self::CONDITIONS[$condition] ?? $condition ?? 'Unknown';
    }

    public function addQuantity(int $amount = 1): void
    {
        $this->increment('quantity', $amount);
    }

    public function removeQuantity(int $amount = 1): void
    {
        $newQuantity = max(0, $this->quantity - $amount);

        if ($newQuantity === 0) {
            $this->delete();
        } else {
            $this->update(['quantity' => $newQuantity]);
        }
    }
}
