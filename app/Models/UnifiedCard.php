<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class UnifiedCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'game',
        'name',
        'name_normalized',
        'type_line',
        'types',
        'subtypes',
        'supertypes',
        'text',
        'text_normalized',
        'cost',
        'power',
        'defense',
        'health',
        'colors',
        'keywords',
        'legalities',
        'game_specific',
        'external_ids',
    ];

    protected function casts(): array
    {
        return [
            'types' => 'array',
            'subtypes' => 'array',
            'supertypes' => 'array',
            'colors' => 'array',
            'keywords' => 'array',
            'legalities' => 'array',
            'game_specific' => 'array',
            'external_ids' => 'array',
            'health' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (UnifiedCard $card) {
            if ($card->isDirty('name') || empty($card->name_normalized)) {
                $card->name_normalized = self::normalize($card->name);
            }
            if ($card->isDirty('text') || ($card->text && empty($card->text_normalized))) {
                $card->text_normalized = self::normalize($card->text);
            }
        });
    }

    public static function normalize(?string $text): string
    {
        if ($text === null) {
            return '';
        }

        return Str::lower(Str::ascii($text));
    }

    public function printings(): HasMany
    {
        return $this->hasMany(UnifiedPrinting::class, 'card_id');
    }

    public function scopeForGame($query, string $game)
    {
        return $query->where('game', $game);
    }

    public function scopeSearch($query, string $search)
    {
        $normalized = self::normalize($search);

        return $query->where('name_normalized', 'like', "%{$normalized}%");
    }

    public function getGameSpecificValue(string $key, $default = null)
    {
        return data_get($this->game_specific, $key, $default);
    }

    public function setGameSpecificValue(string $key, $value): void
    {
        $gameSpecific = $this->game_specific ?? [];
        data_set($gameSpecific, $key, $value);
        $this->game_specific = $gameSpecific;
    }
}
