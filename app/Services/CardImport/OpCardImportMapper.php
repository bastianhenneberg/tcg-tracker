<?php

namespace App\Services\CardImport;

use App\Contracts\CardImport\CardImportMapperInterface;
use App\Models\UnifiedCard;
use App\Models\UnifiedSet;

class OpCardImportMapper implements CardImportMapperInterface
{
    public const RARITIES = [
        'L' => 'Leader',
        'C' => 'Common',
        'UC' => 'Uncommon',
        'R' => 'Rare',
        'SR' => 'Super Rare',
        'SEC' => 'Secret Rare',
        'SP' => 'Special',
        'P' => 'Promo',
    ];

    public const CARD_TYPES = [
        'Leader' => 'Leader',
        'Character' => 'Character',
        'Event' => 'Event',
        'Stage' => 'Stage',
    ];

    public function getGameSlug(): string
    {
        return 'onepiece';
    }

    public function mapSet(array $externalData): array
    {
        return [
            'game' => $this->getGameSlug(),
            'code' => strtoupper($externalData['code'] ?? $externalData['id'] ?? ''),
            'name' => $externalData['name'] ?? '',
            'set_type' => $externalData['set_type'] ?? 'booster',
            'released_at' => $externalData['release_date'] ?? $externalData['released_at'] ?? null,
            'card_count' => $externalData['card_count'] ?? null,
            'icon_url' => $externalData['icon_url'] ?? null,
            'game_specific' => [],
            'external_ids' => array_filter([
                'op_id' => $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapCard(array $externalData): array
    {
        $cardType = $externalData['card_type'] ?? $externalData['type'] ?? null;
        $colors = $this->extractColors($externalData);

        return [
            'game' => $this->getGameSlug(),
            'name' => $externalData['name'] ?? '',
            'type_line' => $this->buildTypeLine($externalData),
            'types' => $cardType ? [$cardType] : [],
            'subtypes' => $externalData['types'] ?? [],
            'supertypes' => [],
            'text' => $externalData['effect'] ?? null,
            'cost' => isset($externalData['cost']) ? (string) $externalData['cost'] : null,
            'power' => isset($externalData['power']) ? (string) $externalData['power'] : null,
            'defense' => null,
            'health' => $externalData['life'] ?? null,
            'colors' => $colors,
            'keywords' => [],
            'legalities' => [],
            'game_specific' => array_filter([
                'card_type' => $cardType,
                'color' => $externalData['color'] ?? null,
                'color_secondary' => $externalData['color_secondary'] ?? null,
                'life' => $externalData['life'] ?? null,
                'counter' => $externalData['counter'] ?? null,
                'attribute' => $externalData['attribute'] ?? null,
                'trigger' => $externalData['trigger'] ?? null,
            ]),
            'external_ids' => array_filter([
                'op_id' => $externalData['external_id'] ?? $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapPrinting(array $externalData, UnifiedCard $card, ?UnifiedSet $set = null): array
    {
        $rarity = strtoupper($externalData['rarity'] ?? '');

        return [
            'card_id' => $card->id,
            'set_id' => $set?->id,
            'set_code' => strtoupper($externalData['set_id'] ?? $externalData['set'] ?? $set?->code ?? ''),
            'set_name' => $externalData['set_name'] ?? $set?->name ?? null,
            'collector_number' => $externalData['collector_number'] ?? $externalData['number'] ?? '',
            'rarity' => $rarity,
            'rarity_label' => self::RARITIES[$rarity] ?? $rarity,
            'finish' => ($externalData['is_alternate_art'] ?? false) ? 'alternate' : 'standard',
            'finish_label' => ($externalData['is_alternate_art'] ?? false) ? 'Alternate Art' : 'Standard',
            'language' => strtolower($externalData['language'] ?? 'en'),
            'flavor_text' => null,
            'artist' => $externalData['artist'] ?? null,
            'image_url' => $externalData['image_url'] ?? null,
            'image_url_small' => null,
            'image_url_back' => null,
            'is_promo' => $rarity === 'P',
            'is_reprint' => false,
            'is_variant' => $externalData['is_alternate_art'] ?? false,
            'released_at' => null,
            'prices' => null,
            'game_specific' => array_filter([
                'is_alternate_art' => $externalData['is_alternate_art'] ?? false,
            ]),
            'external_ids' => array_filter([
                'op_printing_id' => $externalData['external_id'] ?? $externalData['id'] ?? null,
            ]),
        ];
    }

    public function extractCardIdentifier(array $externalData): string
    {
        return $externalData['external_id'] ?? $externalData['id'] ?? $externalData['name'] ?? '';
    }

    public function extractPrintingIdentifier(array $externalData): string
    {
        return implode('-', array_filter([
            $externalData['set_id'] ?? $externalData['set'] ?? '',
            $externalData['collector_number'] ?? $externalData['number'] ?? '',
            $externalData['language'] ?? 'en',
            ($externalData['is_alternate_art'] ?? false) ? 'alt' : '',
        ]));
    }

    public function isValidCard(array $externalData): bool
    {
        return ! empty($externalData['name']);
    }

    public function getSupportedExtensions(): array
    {
        return ['json'];
    }

    protected function buildTypeLine(array $data): string
    {
        $parts = [];

        if (! empty($data['card_type'])) {
            $parts[] = $data['card_type'];
        }

        if (! empty($data['types'])) {
            $types = is_array($data['types']) ? implode(' ', $data['types']) : $data['types'];
            if (! empty($parts)) {
                $parts[] = '—';
            }
            $parts[] = $types;
        }

        return implode(' ', $parts);
    }

    protected function extractColors(array $data): array
    {
        $colors = [];

        if (! empty($data['color'])) {
            $colors[] = $data['color'];
        }

        if (! empty($data['color_secondary'])) {
            $colors[] = $data['color_secondary'];
        }

        return $colors;
    }
}
