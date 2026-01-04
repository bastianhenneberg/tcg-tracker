<?php

namespace App\Services\CardImport;

use App\Contracts\CardImport\CardImportMapperInterface;
use App\Models\UnifiedCard;
use App\Models\UnifiedSet;

class RiftboundCardImportMapper implements CardImportMapperInterface
{
    public const RARITIES = [
        'C' => 'Common',
        'U' => 'Uncommon',
        'R' => 'Rare',
        'M' => 'Mythic',
        'L' => 'Legendary',
    ];

    public const DOMAINS = [
        'Fury' => 'Fury',
        'Calm' => 'Calm',
        'Mind' => 'Mind',
        'Body' => 'Body',
        'Chaos' => 'Chaos',
        'Order' => 'Order',
    ];

    public function getGameSlug(): string
    {
        return 'riftbound';
    }

    public function mapSet(array $externalData): array
    {
        return [
            'game' => $this->getGameSlug(),
            'code' => strtoupper($externalData['code'] ?? $externalData['id'] ?? ''),
            'name' => $externalData['name'] ?? '',
            'set_type' => $externalData['set_type'] ?? 'expansion',
            'released_at' => $externalData['release_date'] ?? $externalData['released_at'] ?? null,
            'card_count' => $externalData['card_count'] ?? null,
            'icon_url' => $externalData['icon_url'] ?? null,
            'game_specific' => [],
            'external_ids' => array_filter([
                'riftbound_id' => $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapCard(array $externalData): array
    {
        $types = $externalData['types'] ?? [];
        $domains = $externalData['domains'] ?? [];

        return [
            'game' => $this->getGameSlug(),
            'name' => $externalData['name'] ?? '',
            'type_line' => $this->buildTypeLine($types, $domains),
            'types' => $types,
            'subtypes' => [],
            'supertypes' => [],
            'text' => $externalData['functional_text'] ?? null,
            'cost' => isset($externalData['energy']) ? (string) $externalData['energy'] : null,
            'power' => isset($externalData['power']) ? (string) $externalData['power'] : null,
            'defense' => null,
            'health' => null,
            'colors' => $domains, // Domains are like colors in Riftbound
            'keywords' => [],
            'legalities' => [],
            'game_specific' => array_filter([
                'energy' => $externalData['energy'] ?? null,
                'domains' => $domains,
                'illustrators' => $externalData['illustrators'] ?? null,
            ]),
            'external_ids' => array_filter([
                'riftbound_id' => $externalData['external_id'] ?? $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapPrinting(array $externalData, UnifiedCard $card, ?UnifiedSet $set = null): array
    {
        $rarity = strtoupper($externalData['rarity'] ?? 'C');

        return [
            'card_id' => $card->id,
            'set_id' => $set?->id,
            'set_code' => strtoupper($externalData['set_id'] ?? $externalData['set'] ?? $set?->code ?? ''),
            'set_name' => $externalData['set_name'] ?? $set?->name ?? null,
            'collector_number' => $externalData['collector_number'] ?? $externalData['number'] ?? '',
            'rarity' => $rarity,
            'rarity_label' => self::RARITIES[$rarity] ?? $rarity,
            'finish' => $externalData['foiling'] ?? 'standard',
            'finish_label' => ucfirst($externalData['foiling'] ?? 'Standard'),
            'language' => strtolower($externalData['language'] ?? 'en'),
            'flavor_text' => $externalData['flavor_text'] ?? null,
            'artist' => is_array($externalData['illustrators'] ?? null)
                ? implode(', ', $externalData['illustrators'])
                : ($externalData['artist'] ?? null),
            'image_url' => $externalData['image_url'] ?? null,
            'image_url_small' => null,
            'image_url_back' => null,
            'is_promo' => $externalData['is_promo'] ?? false,
            'is_reprint' => false,
            'is_variant' => $externalData['is_variant'] ?? false,
            'released_at' => null,
            'prices' => null,
            'game_specific' => [],
            'external_ids' => array_filter([
                'riftbound_printing_id' => $externalData['external_id'] ?? $externalData['id'] ?? null,
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
            $externalData['foiling'] ?? 'standard',
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

    protected function buildTypeLine(array $types, array $domains): string
    {
        $parts = [];

        if (! empty($types)) {
            $parts[] = implode(' ', $types);
        }

        if (! empty($domains)) {
            if (! empty($parts)) {
                $parts[] = '—';
            }
            $parts[] = implode(' ', $domains);
        }

        return implode(' ', $parts);
    }
}
