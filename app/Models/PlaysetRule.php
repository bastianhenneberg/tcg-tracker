<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlaysetRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'game_format_id',
        'name',
        'max_copies',
        'priority',
        'conditions',
    ];

    protected function casts(): array
    {
        return [
            'max_copies' => 'integer',
            'priority' => 'integer',
            'conditions' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gameFormat(): BelongsTo
    {
        return $this->belongsTo(GameFormat::class);
    }

    /**
     * Evaluate if a card matches this rule's conditions.
     *
     * @param  array  $cardData  Card attributes to match against
     */
    public function matches(array $cardData): bool
    {
        $conditions = $this->conditions;

        if (empty($conditions) || empty($conditions['rules'])) {
            return true; // No conditions = matches everything (default rule)
        }

        $matchAll = $conditions['match_all'] ?? true;
        $results = [];

        foreach ($conditions['rules'] as $rule) {
            $field = $rule['field'] ?? null;
            $operator = $rule['operator'] ?? 'equals';
            $value = $rule['value'] ?? null;

            if (! $field) {
                continue;
            }

            $cardValue = $cardData[$field] ?? null;
            $results[] = $this->evaluateCondition($cardValue, $operator, $value);
        }

        if (empty($results)) {
            return true;
        }

        return $matchAll
            ? ! in_array(false, $results, true)
            : in_array(true, $results, true);
    }

    /**
     * Evaluate a single condition.
     */
    private function evaluateCondition(mixed $cardValue, string $operator, mixed $ruleValue): bool
    {
        return match ($operator) {
            'equals' => $cardValue === $ruleValue,
            'not_equals' => $cardValue !== $ruleValue,
            'contains' => is_array($cardValue) && in_array($ruleValue, $cardValue, true),
            'not_contains' => ! is_array($cardValue) || ! in_array($ruleValue, $cardValue, true),
            'in' => is_array($ruleValue) && in_array($cardValue, $ruleValue, true),
            'not_in' => ! is_array($ruleValue) || ! in_array($cardValue, $ruleValue, true),
            'greater_than' => is_numeric($cardValue) && is_numeric($ruleValue) && $cardValue > $ruleValue,
            'less_than' => is_numeric($cardValue) && is_numeric($ruleValue) && $cardValue < $ruleValue,
            default => false,
        };
    }

    // Scopes

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForFormat($query, int $gameFormatId)
    {
        return $query->where('game_format_id', $gameFormatId);
    }

    public function scopeOrderedByPriority($query)
    {
        return $query->orderByDesc('priority');
    }
}
