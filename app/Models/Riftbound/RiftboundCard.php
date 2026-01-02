<?php

namespace App\Models\Riftbound;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RiftboundCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'external_id',
        'name',
        'types',
        'domains',
        'energy',
        'power',
        'functional_text',
        'illustrators',
    ];

    protected function casts(): array
    {
        return [
            'types' => 'array',
            'domains' => 'array',
            'illustrators' => 'array',
        ];
    }

    public function printings(): HasMany
    {
        return $this->hasMany(RiftboundPrinting::class);
    }

    // Domain constants
    public const DOMAINS = [
        'Fury' => 'Fury',
        'Calm' => 'Calm',
        'Mind' => 'Mind',
        'Body' => 'Body',
        'Chaos' => 'Chaos',
        'Order' => 'Order',
    ];

    // Card type constants
    public const TYPES = [
        'Champion' => 'Champion',
        'Spell' => 'Spell',
        'Ability' => 'Ability',
        'Item' => 'Item',
        'Landmark' => 'Landmark',
    ];
}
