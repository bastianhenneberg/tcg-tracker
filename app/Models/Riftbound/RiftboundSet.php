<?php

namespace App\Models\Riftbound;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RiftboundSet extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'release_date',
    ];

    protected function casts(): array
    {
        return [
            'release_date' => 'date',
        ];
    }

    public function printings(): HasMany
    {
        return $this->hasMany(RiftboundPrinting::class);
    }
}
