<?php

namespace App\Services\CardImport;

use App\Contracts\CardImport\CardImportMapperInterface;
use App\Models\UnifiedCard;
use App\Models\UnifiedSet;

/**
 * Yu-Gi-Oh Import Mapper
 * Supports data from YGOPRODeck API
 */
class YugiohCardImportMapper implements CardImportMapperInterface
{
    public const FRAME_TYPES = [
        'normal' => 'Normal Monster',
        'effect' => 'Effect Monster',
        'ritual' => 'Ritual Monster',
        'fusion' => 'Fusion Monster',
        'synchro' => 'Synchro Monster',
        'xyz' => 'XYZ Monster',
        'link' => 'Link Monster',
        'pendulum' => 'Pendulum Monster',
        'spell' => 'Spell Card',
        'trap' => 'Trap Card',
        'token' => 'Token',
        'skill' => 'Skill Card',
    ];

    public const ATTRIBUTES = [
        'DARK' => 'DARK',
        'LIGHT' => 'LIGHT',
        'WATER' => 'WATER',
        'FIRE' => 'FIRE',
        'EARTH' => 'EARTH',
        'WIND' => 'WIND',
        'DIVINE' => 'DIVINE',
    ];

    public function getGameSlug(): string
    {
        return 'yugioh';
    }

    public function mapSet(array $externalData): array
    {
        return [
            'game' => $this->getGameSlug(),
            'code' => strtoupper($externalData['set_code'] ?? ''),
            'name' => $externalData['set_name'] ?? '',
            'set_type' => $externalData['set_type'] ?? null,
            'released_at' => $externalData['tcg_date'] ?? null,
            'card_count' => $externalData['num_of_cards'] ?? null,
            'icon_url' => null,
            'game_specific' => array_filter([
                'ocg_date' => $externalData['ocg_date'] ?? null,
            ]),
            'external_ids' => array_filter([
                'ygoprodeck_id' => $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapCard(array $externalData): array
    {
        $type = $externalData['type'] ?? '';
        $frameType = $externalData['frameType'] ?? 'normal';
        $race = $externalData['race'] ?? null; // Monster type or Spell/Trap subtype

        return [
            'game' => $this->getGameSlug(),
            'name' => $externalData['name'] ?? '',
            'type_line' => $type,
            'types' => $this->parseTypes($type, $frameType),
            'subtypes' => $race ? [$race] : [],
            'supertypes' => [],
            'text' => $externalData['desc'] ?? null,
            'cost' => isset($externalData['level']) ? (string) $externalData['level'] : null,
            'power' => isset($externalData['atk']) ? (string) $externalData['atk'] : null,
            'defense' => isset($externalData['def']) ? (string) $externalData['def'] : null,
            'health' => null,
            'colors' => ! empty($externalData['attribute']) ? [$externalData['attribute']] : [],
            'keywords' => [],
            'legalities' => $this->mapLegalities($externalData),
            'game_specific' => array_filter([
                'passcode' => $externalData['id'] ?? null,
                'frame_type' => $frameType,
                'atk' => $externalData['atk'] ?? null,
                'def' => $externalData['def'] ?? null,
                'level' => $externalData['level'] ?? null,
                'rank' => $externalData['rank'] ?? null,
                'scale' => $externalData['scale'] ?? null,
                'linkval' => $externalData['linkval'] ?? null,
                'linkmarkers' => $externalData['linkmarkers'] ?? null,
                'race' => $race,
                'attribute' => $externalData['attribute'] ?? null,
                'archetype' => $externalData['archetype'] ?? null,
                'has_effect' => $externalData['has_effect'] ?? null,
            ]),
            'external_ids' => array_filter([
                'ygoprodeck_id' => $externalData['id'] ?? null,
                'konami_id' => $externalData['misc_info'][0]['konami_id'] ?? null,
            ]),
        ];
    }

    public function mapPrinting(array $externalData, UnifiedCard $card, ?UnifiedSet $set = null): array
    {
        // YGOPRODeck returns printings in card_sets array
        $setData = $externalData['_set_data'] ?? [];
        $rarity = $setData['set_rarity'] ?? null;
        $rarityCode = $setData['set_rarity_code'] ?? $rarity;

        return [
            'card_id' => $card->id,
            'set_id' => $set?->id,
            'set_code' => strtoupper($setData['set_code'] ?? $set?->code ?? ''),
            'set_name' => $setData['set_name'] ?? $set?->name ?? null,
            'collector_number' => $setData['set_code'] ?? '', // YGO uses set code as collector number
            'rarity' => $rarityCode,
            'rarity_label' => $rarity,
            'finish' => 'standard',
            'finish_label' => 'Standard',
            'language' => 'en',
            'flavor_text' => null,
            'artist' => null,
            'image_url' => $externalData['card_images'][0]['image_url'] ?? null,
            'image_url_small' => $externalData['card_images'][0]['image_url_small'] ?? null,
            'image_url_back' => null,
            'is_promo' => str_contains(strtolower($rarity ?? ''), 'promo'),
            'is_reprint' => false,
            'is_variant' => false,
            'released_at' => null,
            'prices' => $this->mapPrices($externalData),
            'game_specific' => array_filter([
                'set_price' => $setData['set_price'] ?? null,
            ]),
            'external_ids' => array_filter([
                'ygoprodeck_id' => $externalData['id'] ?? null,
            ]),
        ];
    }

    public function extractCardIdentifier(array $externalData): string
    {
        // YGO cards are identified by their passcode (id)
        return (string) ($externalData['id'] ?? $externalData['name'] ?? '');
    }

    public function extractPrintingIdentifier(array $externalData): string
    {
        $setData = $externalData['_set_data'] ?? [];

        return implode('-', array_filter([
            $externalData['id'] ?? '',
            $setData['set_code'] ?? '',
            $setData['set_rarity_code'] ?? '',
        ]));
    }

    public function isValidCard(array $externalData): bool
    {
        return ! empty($externalData['name']) && ! empty($externalData['id']);
    }

    public function getSupportedExtensions(): array
    {
        return ['json'];
    }

    protected function parseTypes(string $type, string $frameType): array
    {
        $types = [];

        // Add frame type as primary type
        if (isset(self::FRAME_TYPES[$frameType])) {
            $types[] = self::FRAME_TYPES[$frameType];
        }

        // Parse additional types from type line
        $typeKeywords = ['Effect', 'Tuner', 'Flip', 'Spirit', 'Union', 'Gemini', 'Toon', 'Pendulum'];
        foreach ($typeKeywords as $keyword) {
            if (stripos($type, $keyword) !== false) {
                $types[] = $keyword;
            }
        }

        return array_unique($types);
    }

    protected function mapLegalities(array $data): array
    {
        $legalities = [];

        if (isset($data['banlist_info'])) {
            if (isset($data['banlist_info']['ban_tcg'])) {
                $legalities['tcg'] = strtolower($data['banlist_info']['ban_tcg']);
            }
            if (isset($data['banlist_info']['ban_ocg'])) {
                $legalities['ocg'] = strtolower($data['banlist_info']['ban_ocg']);
            }
            if (isset($data['banlist_info']['ban_goat'])) {
                $legalities['goat'] = strtolower($data['banlist_info']['ban_goat']);
            }
        }

        return $legalities;
    }

    protected function mapPrices(array $data): ?array
    {
        if (empty($data['card_prices'])) {
            return null;
        }

        $priceData = $data['card_prices'][0] ?? [];

        return [
            'tcgplayer' => [
                'price' => $priceData['tcgplayer_price'] ?? null,
            ],
            'cardmarket' => [
                'price' => $priceData['cardmarket_price'] ?? null,
            ],
            'ebay' => [
                'price' => $priceData['ebay_price'] ?? null,
            ],
            'amazon' => [
                'price' => $priceData['amazon_price'] ?? null,
            ],
        ];
    }
}
