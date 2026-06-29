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
        'E' => 'Epic',
        'O' => 'Overnumbered',
        'L' => 'Legendary',
        'P' => 'Promo',
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
        // Accept both the normalized format and the raw community feed (OwenMelbz gist),
        // where types/domains are arrays of {id,label} objects and text contains HTML.
        $types = $this->extractLabels($externalData['types'] ?? $externalData['cardType'] ?? []);
        $domains = $this->extractLabels($externalData['domains'] ?? []);
        $illustrators = $this->toList($externalData['illustrators'] ?? $externalData['illustrator'] ?? []);

        return [
            'game' => $this->getGameSlug(),
            'name' => $externalData['name'] ?? '',
            'type_line' => $this->buildTypeLine($types, $domains),
            'types' => $types,
            'subtypes' => [],
            'supertypes' => [],
            'text' => $this->cleanText($externalData['functional_text'] ?? $externalData['text'] ?? null),
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
                'illustrators' => $illustrators ?: null,
            ]),
            'external_ids' => array_filter([
                'riftbound_id' => $externalData['external_id'] ?? $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapPrinting(array $externalData, UnifiedCard $card, ?UnifiedSet $set = null): array
    {
        $rarity = $this->mapRarity($externalData['rarity'] ?? null);
        $illustrators = $this->toList($externalData['illustrators'] ?? $externalData['illustrator'] ?? []);

        return [
            'card_id' => $card->id,
            'set_id' => $set?->id,
            'set_code' => strtoupper($externalData['set_id'] ?? $externalData['set'] ?? $set?->code ?? ''),
            'set_name' => $externalData['set_name'] ?? $externalData['setName'] ?? $set?->name ?? null,
            'collector_number' => (string) ($externalData['collector_number'] ?? $externalData['number'] ?? $externalData['collectorNumber'] ?? $externalData['publicCode'] ?? ''),
            'rarity' => $rarity,
            'rarity_label' => self::RARITIES[$rarity] ?? $rarity,
            'finish' => $externalData['foiling'] ?? 'standard',
            'finish_label' => ucfirst($externalData['foiling'] ?? 'Standard'),
            'language' => strtolower($externalData['language'] ?? 'en'),
            'flavor_text' => $externalData['flavor_text'] ?? null,
            'artist' => ! empty($illustrators)
                ? implode(', ', $illustrators)
                : ($externalData['artist'] ?? null),
            'image_url' => $externalData['image_url'] ?? ($externalData['cardImage']['url'] ?? null),
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

    /**
     * Extract string labels from a list that may contain {id,label} objects or plain strings.
     *
     * @param  mixed  $items
     * @return array<int, string>
     */
    protected function extractLabels($items): array
    {
        if (! is_array($items)) {
            return [];
        }

        return collect($items)
            ->map(fn ($item) => is_array($item) ? ($item['label'] ?? $item['id'] ?? null) : $item)
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Map a rarity (raw {id,label} object or string) to the single-letter code used by GameAttribute.
     */
    protected function mapRarity(mixed $rarity): string
    {
        $value = strtolower((string) ($this->scalarLabel($rarity) ?? 'common'));

        return match ($value) {
            'common', 'c' => 'C',
            'uncommon', 'u' => 'U',
            'rare', 'r' => 'R',
            'mythic', 'm' => 'M',
            'epic', 'e' => 'E',
            'showcase', 'overnumbered', 'o' => 'O',
            'legendary', 'l' => 'L',
            'promo', 'p' => 'P',
            default => strtoupper($value),
        };
    }

    /**
     * Resolve a scalar label from a value that may be a {id,label} object, a string, or null.
     */
    protected function scalarLabel(mixed $value): ?string
    {
        if (is_array($value)) {
            return $value['label'] ?? $value['id'] ?? null;
        }

        return $value !== null ? (string) $value : null;
    }

    /**
     * Normalize a value into a list of strings (accepts string or array).
     *
     * @param  mixed  $value
     * @return array<int, string>
     */
    protected function toList($value): array
    {
        if (is_string($value)) {
            return $value !== '' ? [$value] : [];
        }

        return is_array($value) ? array_values(array_filter($value)) : [];
    }

    /**
     * Strip HTML tags and normalize whitespace from rich text.
     */
    protected function cleanText(?string $text): ?string
    {
        if (! $text) {
            return null;
        }

        return trim(preg_replace('/\s+/', ' ', strip_tags($text)));
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
