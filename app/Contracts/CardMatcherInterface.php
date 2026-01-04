<?php

namespace App\Contracts;

use Illuminate\Support\Collection;

interface CardMatcherInterface
{
    /**
     * Find a card printing that matches the recognition result.
     *
     * @param  array{card_name?: string|null, set_code?: string|null, collector_number?: string|null, foiling?: string|null}  $recognitionResult
     * @return array{match: \App\Models\UnifiedPrinting|\App\Models\Custom\CustomPrinting|null, confidence: string, alternatives: Collection, is_custom: bool}
     */
    public function findMatch(array $recognitionResult): array;

    /**
     * Search for cards with autocomplete.
     *
     * @return Collection<int, array{id: int, card_name: string, set_name: string, collector_number: string, rarity: string|null, rarity_label: string|null, foiling: string|null, foiling_label: string|null, image_url: string|null, is_custom: bool}>
     */
    public function search(string $query, int $limit = 20): Collection;

    /**
     * Get the game slug this matcher is for.
     */
    public function getGameSlug(): string;
}
