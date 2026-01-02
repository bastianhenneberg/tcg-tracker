<?php

namespace App\Services;

use App\Models\Custom\CustomCollection;
use App\Models\Fab\FabCard;
use App\Models\Fab\FabCollection;
use App\Models\GameFormat;
use App\Models\PlaysetRule;
use Illuminate\Support\Collection;

class PlaysetService
{
    /**
     * Default max copies if no rules match.
     */
    public const DEFAULT_MAX_COPIES = 3;

    /**
     * Get playset status for all cards in a user's collection for a specific format.
     *
     * @return Collection<string, array{card_name: string, owned: int, max: int, complete: bool, rules: array}>
     */
    public function getPlaysetStatus(int $userId, int $gameFormatId): Collection
    {
        $format = GameFormat::with('game')->findOrFail($gameFormatId);
        $rules = $this->getRulesForFormat($userId, $gameFormatId);

        // Get FAB collection grouped by card name
        $fabCollection = $this->getFabCollectionByCardName($userId, $format->game_id);

        // Get Custom collection grouped by card name
        $customCollection = $this->getCustomCollectionByCardName($userId, $format->game_id);

        // Merge collections
        $allCards = $fabCollection->merge($customCollection);

        // Build playset info for each card
        return $allCards->map(function ($cardData, $cardName) use ($rules) {
            $maxCopies = $this->getMaxCopiesForCard($cardData, $rules);

            return [
                'card_name' => $cardName,
                'owned' => $cardData['quantity'],
                'max' => $maxCopies,
                'complete' => $cardData['quantity'] >= $maxCopies,
                'rules' => $this->getMatchingRules($cardData, $rules),
            ];
        });
    }

    /**
     * Get playset info for a single card by name.
     *
     * @return array{card_name: string, owned: int, max: int, complete: bool, rules: array}
     */
    public function getCardPlaysetInfo(string $cardName, int $userId, int $gameFormatId): array
    {
        $format = GameFormat::with('game')->findOrFail($gameFormatId);
        $rules = $this->getRulesForFormat($userId, $gameFormatId);

        // Get FAB card data
        $fabCard = FabCard::where('name', $cardName)->first();
        $fabQuantity = 0;
        $cardData = ['quantity' => 0, 'rarity' => null, 'types' => [], 'traits' => []];

        if ($fabCard) {
            $fabQuantity = FabCollection::where('user_id', $userId)
                ->whereHas('printing', fn ($q) => $q->where('fab_card_id', $fabCard->id))
                ->sum('quantity');

            $cardData = [
                'quantity' => $fabQuantity,
                'rarity' => $fabCard->printings()->first()?->rarity,
                'types' => $fabCard->types ?? [],
                'traits' => $fabCard->traits ?? [],
            ];
        }

        // Check custom cards too
        $customQuantity = CustomCollection::where('user_id', $userId)
            ->whereHas('printing.card', fn ($q) => $q
                ->where('game_id', $format->game_id)
                ->where('name', $cardName))
            ->sum('quantity');

        $cardData['quantity'] = $fabQuantity + $customQuantity;

        $maxCopies = $this->getMaxCopiesForCard($cardData, $rules);

        return [
            'card_name' => $cardName,
            'owned' => $cardData['quantity'],
            'max' => $maxCopies,
            'complete' => $cardData['quantity'] >= $maxCopies,
            'rules' => $this->getMatchingRules($cardData, $rules),
        ];
    }

    /**
     * Get all playset rules for a format (user rules first, then system defaults).
     *
     * @return Collection<PlaysetRule>
     */
    public function getRulesForFormat(int $userId, int $gameFormatId): Collection
    {
        return PlaysetRule::where('game_format_id', $gameFormatId)
            ->where('user_id', $userId)
            ->orderByDesc('priority')
            ->get();
    }

    /**
     * Get FAB collection quantities grouped by card name.
     *
     * @return Collection<string, array{quantity: int, rarity: ?string, types: array, traits: array}>
     */
    private function getFabCollectionByCardName(int $userId, int $gameId): Collection
    {
        return FabCollection::where('user_id', $userId)
            ->with(['printing.card'])
            ->get()
            ->groupBy(fn ($item) => $item->printing->card->name)
            ->map(function ($items, $cardName) {
                $firstItem = $items->first();
                $card = $firstItem->printing->card;

                return [
                    'quantity' => $items->sum('quantity'),
                    'rarity' => $firstItem->printing->rarity,
                    'types' => $card->types ?? [],
                    'traits' => $card->traits ?? [],
                    'card_keywords' => $card->card_keywords ?? [],
                    'source' => 'fab',
                ];
            });
    }

    /**
     * Get Custom collection quantities grouped by card name.
     *
     * @return Collection<string, array{quantity: int, rarity: ?string, types: array, traits: array}>
     */
    private function getCustomCollectionByCardName(int $userId, int $gameId): Collection
    {
        return CustomCollection::where('user_id', $userId)
            ->whereHas('printing.card', fn ($q) => $q->where('game_id', $gameId))
            ->with(['printing.card'])
            ->get()
            ->groupBy(fn ($item) => $item->printing->card->name)
            ->map(function ($items, $cardName) {
                $firstItem = $items->first();
                $card = $firstItem->printing->card;

                return [
                    'quantity' => $items->sum('quantity'),
                    'rarity' => $firstItem->printing->rarity,
                    'types' => $card->types ?? [],
                    'traits' => $card->traits ?? [],
                    'card_keywords' => $card->card_keywords ?? [],
                    'source' => 'custom',
                ];
            });
    }

    /**
     * Get the max copies allowed for a card based on matching rules.
     */
    private function getMaxCopiesForCard(array $cardData, Collection $rules): int
    {
        // Find the first matching rule (rules are ordered by priority desc)
        foreach ($rules as $rule) {
            if ($rule->matches($cardData)) {
                return $rule->max_copies;
            }
        }

        // No matching rule, return default
        return self::DEFAULT_MAX_COPIES;
    }

    /**
     * Get all matching rules for a card (for debugging/display purposes).
     */
    private function getMatchingRules(array $cardData, Collection $rules): array
    {
        return $rules
            ->filter(fn ($rule) => $rule->matches($cardData))
            ->map(fn ($rule) => [
                'name' => $rule->name,
                'max_copies' => $rule->max_copies,
                'priority' => $rule->priority,
            ])
            ->values()
            ->all();
    }

    /**
     * Create default playset rules for a user and format.
     */
    public function createDefaultRulesForUser(int $userId, int $gameFormatId): void
    {
        $format = GameFormat::findOrFail($gameFormatId);

        // Only create if user doesn't have rules yet
        if (PlaysetRule::where('user_id', $userId)->where('game_format_id', $gameFormatId)->exists()) {
            return;
        }

        // Create default rules based on format
        $defaultRules = $this->getDefaultRulesForFormat($format);

        foreach ($defaultRules as $ruleData) {
            PlaysetRule::create([
                'user_id' => $userId,
                'game_format_id' => $gameFormatId,
                ...$ruleData,
            ]);
        }
    }

    /**
     * Get default rules template for a format.
     */
    private function getDefaultRulesForFormat(GameFormat $format): array
    {
        // FAB specific defaults
        if ($format->game->slug === 'fab') {
            return match ($format->slug) {
                'blitz' => [
                    [
                        'name' => 'Default',
                        'max_copies' => 2,
                        'priority' => 0,
                        'conditions' => [],
                    ],
                    [
                        'name' => 'Hero',
                        'max_copies' => 1,
                        'priority' => 20,
                        'conditions' => [
                            'match_all' => true,
                            'rules' => [
                                ['field' => 'types', 'operator' => 'contains', 'value' => 'Hero'],
                            ],
                        ],
                    ],
                    [
                        'name' => 'Legendary Equipment',
                        'max_copies' => 1,
                        'priority' => 10,
                        'conditions' => [
                            'match_all' => true,
                            'rules' => [
                                ['field' => 'rarity', 'operator' => 'equals', 'value' => 'L'],
                                ['field' => 'types', 'operator' => 'contains', 'value' => 'Equipment'],
                            ],
                        ],
                    ],
                ],
                'classic-constructed' => [
                    [
                        'name' => 'Default',
                        'max_copies' => 3,
                        'priority' => 0,
                        'conditions' => [],
                    ],
                    [
                        'name' => 'Hero',
                        'max_copies' => 1,
                        'priority' => 20,
                        'conditions' => [
                            'match_all' => true,
                            'rules' => [
                                ['field' => 'types', 'operator' => 'contains', 'value' => 'Hero'],
                            ],
                        ],
                    ],
                    [
                        'name' => 'Legendary',
                        'max_copies' => 1,
                        'priority' => 10,
                        'conditions' => [
                            'match_all' => true,
                            'rules' => [
                                ['field' => 'rarity', 'operator' => 'equals', 'value' => 'L'],
                            ],
                        ],
                    ],
                ],
                default => [
                    [
                        'name' => 'Default',
                        'max_copies' => 3,
                        'priority' => 0,
                        'conditions' => [],
                    ],
                ],
            };
        }

        // Generic default for other games
        return [
            [
                'name' => 'Default',
                'max_copies' => 4,
                'priority' => 0,
                'conditions' => [],
            ],
        ];
    }

    /**
     * Get incomplete playsets (cards where owned < max).
     */
    public function getIncompletePlaysets(int $userId, int $gameFormatId): Collection
    {
        return $this->getPlaysetStatus($userId, $gameFormatId)
            ->filter(fn ($playset) => ! $playset['complete']);
    }

    /**
     * Get complete playsets (cards where owned >= max).
     */
    public function getCompletePlaysets(int $userId, int $gameFormatId): Collection
    {
        return $this->getPlaysetStatus($userId, $gameFormatId)
            ->filter(fn ($playset) => $playset['complete']);
    }
}
