<?php

namespace App\Services\CardImport;

use App\Contracts\CardImport\CardImportMapperInterface;
use App\Models\UnifiedCard;
use App\Models\UnifiedSet;

class MtgCardImportMapper implements CardImportMapperInterface
{
    public const RARITIES = [
        'common' => 'Common',
        'uncommon' => 'Uncommon',
        'rare' => 'Rare',
        'mythic' => 'Mythic Rare',
        'special' => 'Special',
        'bonus' => 'Bonus',
    ];

    public function getGameSlug(): string
    {
        return 'mtg';
    }

    public function mapSet(array $externalData): array
    {
        return [
            'game' => $this->getGameSlug(),
            'code' => strtoupper($externalData['code'] ?? $externalData['set'] ?? ''),
            'name' => $externalData['name'] ?? '',
            'set_type' => $externalData['set_type'] ?? null,
            'released_at' => $externalData['released_at'] ?? null,
            'card_count' => $externalData['card_count'] ?? null,
            'icon_url' => $externalData['icon_svg_uri'] ?? null,
            'game_specific' => array_filter([
                'scryfall_id' => $externalData['id'] ?? null,
                'mtgo_code' => $externalData['mtgo_code'] ?? null,
                'arena_code' => $externalData['arena_code'] ?? null,
                'block' => $externalData['block'] ?? null,
                'parent_set_code' => $externalData['parent_set_code'] ?? null,
            ]),
            'external_ids' => array_filter([
                'scryfall_id' => $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapCard(array $externalData): array
    {
        return [
            'game' => $this->getGameSlug(),
            'name' => $externalData['name'] ?? '',
            'type_line' => $externalData['type_line'] ?? null,
            'types' => $externalData['types'] ?? $this->parseTypes($externalData['type_line'] ?? ''),
            'subtypes' => $externalData['subtypes'] ?? $this->parseSubtypes($externalData['type_line'] ?? ''),
            'supertypes' => $externalData['supertypes'] ?? $this->parseSupertypes($externalData['type_line'] ?? ''),
            'text' => $externalData['oracle_text'] ?? null,
            'cost' => $externalData['mana_cost'] ?? null,
            'power' => $externalData['power'] ?? null,
            'defense' => $externalData['toughness'] ?? $externalData['defense'] ?? null,
            'health' => null,
            'colors' => $externalData['colors'] ?? [],
            'keywords' => $externalData['keywords'] ?? [],
            'legalities' => $this->mapLegalities($externalData['legalities'] ?? []),
            'game_specific' => array_filter([
                'mana_cost' => $externalData['mana_cost'] ?? null,
                'mana_value' => $externalData['cmc'] ?? $externalData['mana_value'] ?? null,
                'color_identity' => $externalData['color_identity'] ?? null,
                'produced_mana' => $externalData['produced_mana'] ?? null,
                'loyalty' => $externalData['loyalty'] ?? null,
                'layout' => $externalData['layout'] ?? 'normal',
                'card_faces' => $externalData['card_faces'] ?? null,
                'all_parts' => $externalData['all_parts'] ?? null,
                'edhrec_rank' => $externalData['edhrec_rank'] ?? null,
            ]),
            'external_ids' => array_filter([
                'oracle_id' => $externalData['oracle_id'] ?? null,
                'scryfall_id' => $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapPrinting(array $externalData, UnifiedCard $card, ?UnifiedSet $set = null): array
    {
        $rarity = strtolower($externalData['rarity'] ?? '');
        $finishes = $externalData['finishes'] ?? [];

        return [
            'card_id' => $card->id,
            'set_id' => $set?->id,
            'set_code' => strtoupper($externalData['set'] ?? $set?->code ?? ''),
            'set_name' => $externalData['set_name'] ?? $set?->name ?? null,
            'collector_number' => $externalData['collector_number'] ?? '',
            'rarity' => $rarity,
            'rarity_label' => self::RARITIES[$rarity] ?? ucfirst($rarity),
            'finish' => $finishes[0] ?? 'nonfoil',
            'finish_label' => ucfirst($finishes[0] ?? 'nonfoil'),
            'language' => strtolower($externalData['lang'] ?? 'en'),
            'flavor_text' => $externalData['flavor_text'] ?? null,
            'artist' => $externalData['artist'] ?? null,
            'image_url' => $externalData['image_uris']['normal'] ?? $externalData['image_url'] ?? null,
            'image_url_small' => $externalData['image_uris']['small'] ?? null,
            'image_url_back' => $externalData['card_faces'][1]['image_uris']['normal'] ?? null,
            'is_promo' => $externalData['promo'] ?? $externalData['is_promo'] ?? false,
            'is_reprint' => $externalData['reprint'] ?? false,
            'is_variant' => $externalData['variation'] ?? false,
            'released_at' => $externalData['released_at'] ?? null,
            'prices' => $this->mapPrices($externalData),
            'game_specific' => array_filter([
                'finishes' => $finishes,
                'has_foil' => in_array('foil', $finishes) || ($externalData['has_foil'] ?? false),
                'has_non_foil' => in_array('nonfoil', $finishes) || ($externalData['has_non_foil'] ?? true),
                'frame' => $externalData['frame'] ?? null,
                'frame_effects' => $externalData['frame_effects'] ?? null,
                'border_color' => $externalData['border_color'] ?? null,
                'is_full_art' => $externalData['full_art'] ?? false,
                'is_textless' => $externalData['textless'] ?? false,
                'is_oversized' => $externalData['oversized'] ?? false,
                'watermark' => $externalData['watermark'] ?? null,
                'mtgo_id' => $externalData['mtgo_id'] ?? null,
                'arena_id' => $externalData['arena_id'] ?? null,
                'tcgplayer_id' => $externalData['tcgplayer_id'] ?? null,
                'cardmarket_id' => $externalData['cardmarket_id'] ?? null,
            ]),
            'external_ids' => array_filter([
                'scryfall_id' => $externalData['id'] ?? null,
                'multiverse_id' => $externalData['multiverse_ids'][0] ?? null,
            ]),
        ];
    }

    public function extractCardIdentifier(array $externalData): string
    {
        // Oracle ID is the best identifier for MTG cards (same card across printings)
        return $externalData['oracle_id'] ?? $externalData['name'] ?? '';
    }

    public function extractPrintingIdentifier(array $externalData): string
    {
        // Scryfall ID is unique per printing
        return $externalData['id'] ?? implode('-', [
            $externalData['set'] ?? '',
            $externalData['collector_number'] ?? '',
            $externalData['lang'] ?? 'en',
        ]);
    }

    public function isValidCard(array $externalData): bool
    {
        return ! empty($externalData['name']);
    }

    public function getSupportedExtensions(): array
    {
        return ['json'];
    }

    protected function parseTypes(string $typeLine): array
    {
        if (empty($typeLine)) {
            return [];
        }

        $mainTypes = ['Artifact', 'Creature', 'Enchantment', 'Instant', 'Land', 'Planeswalker', 'Sorcery', 'Tribal', 'Battle', 'Kindred'];
        $types = [];

        foreach ($mainTypes as $type) {
            if (stripos($typeLine, $type) !== false) {
                $types[] = $type;
            }
        }

        return $types;
    }

    protected function parseSubtypes(string $typeLine): array
    {
        if (! str_contains($typeLine, '—')) {
            return [];
        }

        $parts = explode('—', $typeLine);

        return array_map('trim', explode(' ', trim($parts[1] ?? '')));
    }

    protected function parseSupertypes(string $typeLine): array
    {
        $supertypes = ['Basic', 'Legendary', 'Snow', 'World', 'Ongoing'];
        $found = [];

        foreach ($supertypes as $supertype) {
            if (stripos($typeLine, $supertype) !== false) {
                $found[] = $supertype;
            }
        }

        return $found;
    }

    protected function mapLegalities(array $legalities): array
    {
        $mapped = [];
        foreach ($legalities as $format => $status) {
            $mapped[$format] = strtolower($status);
        }

        return $mapped;
    }

    protected function mapPrices(array $data): ?array
    {
        if (empty($data['prices'])) {
            return null;
        }

        return [
            'scryfall' => [
                'usd' => $data['prices']['usd'] ?? null,
                'usd_foil' => $data['prices']['usd_foil'] ?? null,
                'eur' => $data['prices']['eur'] ?? null,
                'eur_foil' => $data['prices']['eur_foil'] ?? null,
            ],
        ];
    }
}
