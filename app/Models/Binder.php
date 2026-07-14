<?php

namespace App\Models;

use Database\Factories\BinderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Binder extends Model
{
    /** @use HasFactory<BinderFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'color',
        'unified_set_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function set(): BelongsTo
    {
        return $this->belongsTo(UnifiedSet::class, 'unified_set_id');
    }

    public function pages(): HasMany
    {
        return $this->hasMany(BinderPage::class)->orderBy('page_number');
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(UnifiedInventory::class);
    }

    public function getTotalCardCountAttribute(): int
    {
        return $this->inventory_items_count ?? $this->inventoryItems()->count();
    }
}
