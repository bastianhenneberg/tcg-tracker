<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameAttribute extends Model
{
    use HasFactory;

    public const TYPE_RARITY = 'rarity';

    public const TYPE_FOILING = 'foiling';

    public const TYPE_CONDITION = 'condition';

    public const TYPE_LANGUAGE = 'language';

    public const TYPE_EDITION = 'edition';

    protected $fillable = [
        'game_id',
        'type',
        'key',
        'label',
        'sort_order',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'sort_order' => 'integer',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    // Scopes

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeRarities($query)
    {
        return $query->where('type', self::TYPE_RARITY);
    }

    public function scopeFoilings($query)
    {
        return $query->where('type', self::TYPE_FOILING);
    }

    public function scopeConditions($query)
    {
        return $query->where('type', self::TYPE_CONDITION);
    }

    public function scopeLanguages($query)
    {
        return $query->where('type', self::TYPE_LANGUAGE);
    }

    public function scopeEditions($query)
    {
        return $query->where('type', self::TYPE_EDITION);
    }
}
