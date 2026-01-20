<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnifiedInventory extends Model
{
    use HasFactory;

    /**
     * Standard condition grades used across all games.
     */
    public const CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DMG' => 'Damaged',
    ];

    /**
     * Standard language codes.
     */
    public const LANGUAGES = [
        'EN' => 'English',
        'DE' => 'German',
        'FR' => 'French',
        'IT' => 'Italian',
        'ES' => 'Spanish',
        'PT' => 'Portuguese',
        'JA' => 'Japanese',
        'KO' => 'Korean',
        'ZH' => 'Chinese',
    ];

    protected $fillable = [
        'user_id',
        'printing_id',
        'lot_id',
        'box_id',
        'binder_id',
        'binder_page_id',
        'binder_slot',
        'quantity',
        'condition',
        'language',
        'notes',
        'purchase_price',
        'purchase_currency',
        'purchased_at',
        'in_collection',
        'extra',
        'position_in_lot',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'purchase_price' => 'decimal:2',
            'purchased_at' => 'date',
            'in_collection' => 'boolean',
            'extra' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo(UnifiedPrinting::class, 'printing_id');
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function box(): BelongsTo
    {
        return $this->belongsTo(Box::class);
    }

    public function binder(): BelongsTo
    {
        return $this->belongsTo(Binder::class);
    }

    public function binderPage(): BelongsTo
    {
        return $this->belongsTo(BinderPage::class);
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeInCollection($query)
    {
        return $query->where('in_collection', true);
    }

    public function scopeInInventory($query)
    {
        return $query->where('in_collection', false);
    }

    public function scopeForGame($query, string $game)
    {
        return $query->whereHas('printing.card', fn ($q) => $q->where('game', $game));
    }

    public function scopeInLot($query, int $lotId)
    {
        return $query->where('lot_id', $lotId);
    }

    public function scopeInBinder($query, int $binderId)
    {
        return $query->where('binder_id', $binderId);
    }

    public function scopeOnBinderPage($query, int $binderPageId)
    {
        return $query->where('binder_page_id', $binderPageId);
    }

    public function deckAssignments(): HasMany
    {
        return $this->hasMany(DeckInventoryAssignment::class, 'unified_inventory_id');
    }

    public function assignedToDecks(): BelongsToMany
    {
        return $this->belongsToMany(
            Deck::class,
            'deck_inventory_assignments',
            'unified_inventory_id',
            'deck_id'
        )->withPivot('quantity')->withTimestamps();
    }

    /**
     * Get total quantity assigned to decks.
     */
    public function getAssignedQuantityAttribute(): int
    {
        return $this->deckAssignments()->sum('quantity');
    }

    /**
     * Get available (unassigned) quantity.
     */
    public function getAvailableQuantityAttribute(): int
    {
        return max(0, $this->quantity - $this->assigned_quantity);
    }

    /**
     * Check if any quantity is assigned to a deck.
     */
    public function getIsInDeckAttribute(): bool
    {
        return $this->assigned_quantity > 0;
    }
}
