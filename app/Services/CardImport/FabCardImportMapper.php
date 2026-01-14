<?php

namespace App\Services\CardImport;

use App\Contracts\CardImport\CardImportMapperInterface;
use App\Models\UnifiedCard;
use App\Models\UnifiedSet;

class FabCardImportMapper implements CardImportMapperInterface
{
    public const RARITIES = [
        'C' => 'Common',
        'R' => 'Rare',
        'S' => 'Super Rare',
        'M' => 'Majestic',
        'L' => 'Legendary',
        'F' => 'Fabled',
        'P' => 'Promo',
        'T' => 'Token',
    ];

    public const FOILINGS = [
        'S' => 'Standard',
        'R' => 'Rainbow Foil',
        'C' => 'Cold Foil',
        'G' => 'Gold Cold Foil',
    ];

    public const ART_VARIATIONS = [
        'EA' => 'Extended Art',
        'AA' => 'Alternate Art',
        'FA' => 'Full Art',
    ];

    public const EDITIONS = [
        'A' => 'Alpha',
        'F' => 'First Edition',
        'N' => 'Normal',
        'U' => 'Unlimited',
    ];

    public function getGameSlug(): string
    {
        return 'fab';
    }

    public function mapSet(array $externalData): array
    {
        return [
            'game' => $this->getGameSlug(),
            'code' => $externalData['id'] ?? $externalData['set_id'] ?? '',
            'name' => $externalData['name'] ?? '',
            'set_type' => $externalData['set_type'] ?? null,
            'released_at' => isset($externalData['release_date'])
                ? \Carbon\Carbon::parse($externalData['release_date'])->toDateString()
                : null,
            'card_count' => $externalData['card_count'] ?? null,
            'icon_url' => $externalData['icon_url'] ?? null,
            'game_specific' => array_filter([
                'edition' => $externalData['edition'] ?? null,
                'printings_count' => $externalData['printings_count'] ?? null,
            ]),
            'external_ids' => array_filter([
                'fab_id' => $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapCard(array $externalData): array
    {
        $types = $this->parseTypes($externalData);
        $subtypes = $this->parseSubtypes($externalData);

        return [
            'game' => $this->getGameSlug(),
            'name' => $externalData['name'] ?? '',
            'type_line' => $externalData['type_text'] ?? $this->buildTypeLine($types, $subtypes),
            'types' => $types,
            'subtypes' => $subtypes,
            'supertypes' => [],
            'text' => $externalData['functional_text'] ?? null,
            'text_normalized' => null, // Will be auto-set by model
            'cost' => $externalData['cost'] ?? null,
            'power' => $externalData['power'] ?? null,
            'defense' => $externalData['defense'] ?? null,
            'health' => $this->toIntOrNull($externalData['health'] ?? null),
            'colors' => $this->mapPitchToColors($externalData['pitch'] ?? null),
            'keywords' => $externalData['card_keywords'] ?? [],
            'legalities' => $this->mapLegalities($externalData),
            'game_specific' => array_filter([
                'pitch' => $this->toIntOrNull($externalData['pitch'] ?? null),
                'intelligence' => $this->toIntOrNull($externalData['intelligence'] ?? null),
                'arcane' => $this->toIntOrNull($externalData['arcane'] ?? null),
                'traits' => $externalData['traits'] ?? null,
                'abilities_and_effects' => $externalData['abilities_and_effects'] ?? null,
                'played_horizontally' => $externalData['played_horizontally'] ?? false,
                'color' => $externalData['color'] ?? null,
            ]),
            'external_ids' => array_filter([
                'fab_id' => $externalData['unique_id'] ?? $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapPrinting(array $externalData, UnifiedCard $card, ?UnifiedSet $set = null): array
    {
        $rarity = $externalData['rarity'] ?? null;
        $foiling = $externalData['foiling'] ?? 'S';
        $edition = $externalData['edition'] ?? null;
        $artVariations = $externalData['art_variations'] ?? [];

        // Build finish code and label including art variations
        $finishCode = $foiling;
        $finishLabel = self::FOILINGS[$foiling] ?? $foiling;

        if (! empty($artVariations)) {
            // Add art variation to finish code (e.g., "R-EA" for Extended Art Rainbow Foil)
            $artCodes = [];
            $artLabels = [];
            foreach ($artVariations as $artVar) {
                $artCodes[] = $artVar;
                $artLabels[] = self::ART_VARIATIONS[$artVar] ?? $artVar;
            }
            $finishCode = $foiling.'-'.implode('-', $artCodes);
            $finishLabel = implode(' ', $artLabels).' '.$finishLabel;
        }

        return [
            'card_id' => $card->id,
            'set_id' => $set?->id,
            'set_code' => $externalData['set_id'] ?? $set?->code ?? '',
            'set_name' => $externalData['set_name'] ?? $set?->name ?? null,
            'collector_number' => $externalData['collector_number'] ?? $externalData['id'] ?? '',
            'rarity' => $rarity,
            'rarity_label' => self::RARITIES[$rarity] ?? $rarity,
            'finish' => $finishCode,
            'finish_label' => $finishLabel,
            'language' => strtolower($externalData['language'] ?? 'en'),
            'flavor_text' => $externalData['flavor_text'] ?? null,
            'artist' => is_array($externalData['artists'] ?? null)
                ? implode(', ', $externalData['artists'])
                : ($externalData['artists'] ?? $externalData['artist'] ?? null),
            'image_url' => $externalData['image_url'] ?? null,
            'image_url_small' => null,
            'image_url_back' => null,
            'is_promo' => ($rarity === 'P'),
            'is_reprint' => false,
            'is_variant' => $foiling !== 'S' || ! empty($artVariations),
            'released_at' => null,
            'prices' => $this->mapPrices($externalData),
            'game_specific' => array_filter([
                'edition' => $edition,
                'edition_label' => self::EDITIONS[$edition] ?? $edition,
                'art_variations' => ! empty($artVariations) ? $artVariations : null,
                'tcgplayer_product_id' => $externalData['tcgplayer_product_id'] ?? null,
                'tcgplayer_url' => $externalData['tcgplayer_url'] ?? null,
            ]),
            'external_ids' => array_filter([
                'fab_printing_id' => $externalData['unique_id'] ?? $externalData['id'] ?? null,
            ]),
        ];
    }

    public function extractCardIdentifier(array $externalData): string
    {
        return $externalData['unique_id'] ?? $externalData['card_id'] ?? $externalData['name'] ?? '';
    }

    public function extractPrintingIdentifier(array $externalData): string
    {
        $artVariations = $externalData['art_variations'] ?? [];
        $artSuffix = ! empty($artVariations) ? implode('-', $artVariations) : '';

        $parts = [
            $externalData['set_id'] ?? '',
            $externalData['collector_number'] ?? $externalData['id'] ?? '',
            $externalData['foiling'] ?? 'S',
            $artSuffix,
            $externalData['language'] ?? 'EN',
        ];

        return implode('-', array_filter($parts));
    }

    public function isValidCard(array $externalData): bool
    {
        return ! empty($externalData['name']);
    }

    public function getSupportedExtensions(): array
    {
        return ['json'];
    }

    protected function parseTypes(array $data): array
    {
        if (isset($data['types']) && is_array($data['types'])) {
            return $data['types'];
        }

        return [];
    }

    protected function parseSubtypes(array $data): array
    {
        if (isset($data['traits']) && is_array($data['traits'])) {
            return $data['traits'];
        }

        return [];
    }

    protected function buildTypeLine(array $types, array $subtypes): string
    {
        $line = implode(' ', $types);
        if (! empty($subtypes)) {
            $line .= ' - '.implode(' ', $subtypes);
        }

        return $line;
    }

    protected function toIntOrNull(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (int) $value : null;
    }

    protected function mapPitchToColors(mixed $pitch): array
    {
        $pitchInt = $this->toIntOrNull($pitch);

        if ($pitchInt === null) {
            return [];
        }

        return match ($pitchInt) {
            1 => ['red'],
            2 => ['yellow'],
            3 => ['blue'],
            default => [],
        };
    }

    protected function mapLegalities(array $data): array
    {
        $legalities = [];

        // Blitz
        if ($data['blitz_legal'] ?? false) {
            $legalities['blitz'] = $this->getLegalityStatus($data, 'blitz');
        }

        // Classic Constructed
        if ($data['cc_legal'] ?? false) {
            $legalities['cc'] = $this->getLegalityStatus($data, 'cc');
        }

        // Commoner
        if ($data['commoner_legal'] ?? false) {
            $legalities['commoner'] = $this->getLegalityStatus($data, 'commoner');
        }

        // Living Legend
        if ($data['ll_legal'] ?? false) {
            $legalities['ll'] = $this->getLegalityStatus($data, 'll');
        }

        return $legalities;
    }

    protected function getLegalityStatus(array $data, string $format): string
    {
        if ($data["{$format}_banned"] ?? false) {
            return 'banned';
        }
        if ($data["{$format}_suspended"] ?? false) {
            return 'suspended';
        }
        if ($data["{$format}_living_legend"] ?? false) {
            return 'living_legend';
        }
        if ($data["{$format}_restricted"] ?? false) {
            return 'restricted';
        }

        return 'legal';
    }

    protected function mapPrices(array $data): ?array
    {
        if (empty($data['tcgplayer_product_id'])) {
            return null;
        }

        return [
            'tcgplayer' => [
                'product_id' => $data['tcgplayer_product_id'] ?? null,
                'url' => $data['tcgplayer_url'] ?? null,
            ],
        ];
    }
}
