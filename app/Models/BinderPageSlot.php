<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BinderPageSlot extends Model
{
    protected $fillable = [
        'binder_page_id',
        'slot',
        'printing_id',
    ];

    protected function casts(): array
    {
        return [
            'slot' => 'integer',
        ];
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(BinderPage::class, 'binder_page_id');
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo(UnifiedPrinting::class, 'printing_id');
    }
}
