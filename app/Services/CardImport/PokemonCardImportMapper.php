<?php

namespace App\Services\CardImport;

use App\Contracts\CardImport\CardImportMapperInterface;
use App\Models\UnifiedCard;
use App\Models\UnifiedSet;

/**
 * Pokemon TCG Import Mapper
 * Supports data from pokemontcg.io API
 */
class PokemonCardImportMapper implements CardImportMapperInterface
{
    public const RARITIES = [
        'Common' => 'Common',
        'Uncommon' => 'Uncommon',
        'Rare' => 'Rare',
        'Rare Holo' => 'Rare Holo',
        'Rare Holo EX' => 'Rare Holo EX',
        'Rare Holo GX' => 'Rare Holo GX',
        'Rare Holo V' => 'Rare Holo V',
        'Rare Holo VMAX' => 'Rare Holo VMAX',
        'Rare Holo VSTAR' => 'Rare Holo VSTAR',
        'Rare Ultra' => 'Rare Ultra',
        'Rare Secret' => 'Rare Secret',
        'Rare Rainbow' => 'Rare Rainbow',
        'Amazing Rare' => 'Amazing Rare',
        'Promo' => 'Promo',
    ];

    public const SUPERTYPES = [
        'Pokémon' => 'Pokémon',
        'Trainer' => 'Trainer',
        'Energy' => 'Energy',
    ];

    public function getGameSlug(): string
    {
        return 'pokemon';
    }

    public function mapSet(array $externalData): array
    {
        return [
            'game' => $this->getGameSlug(),
            'code' => strtoupper($externalData['id'] ?? $externalData['ptcgoCode'] ?? ''),
            'name' => $externalData['name'] ?? '',
            'set_type' => $externalData['series'] ?? null,
            'released_at' => $externalData['releaseDate'] ?? null,
            'card_count' => $externalData['total'] ?? $externalData['printedTotal'] ?? null,
            'icon_url' => $externalData['images']['symbol'] ?? null,
            'game_specific' => array_filter([
                'series' => $externalData['series'] ?? null,
                'ptcgo_code' => $externalData['ptcgoCode'] ?? null,
                'printed_total' => $externalData['printedTotal'] ?? null,
                'logo_url' => $externalData['images']['logo'] ?? null,
            ]),
            'external_ids' => array_filter([
                'pokemon_tcg_id' => $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapCard(array $externalData): array
    {
        $supertype = $externalData['supertype'] ?? null;
        $subtypes = $externalData['subtypes'] ?? [];
        $types = $externalData['types'] ?? [];

        return [
            'game' => $this->getGameSlug(),
            'name' => $externalData['name'] ?? '',
            'type_line' => $this->buildTypeLine($supertype, $subtypes, $types),
            'types' => $supertype ? [$supertype] : [],
            'subtypes' => array_merge($subtypes, $types),
            'supertypes' => [],
            'text' => $this->buildCardText($externalData),
            'cost' => null,
            'power' => null,
            'defense' => null,
            'health' => isset($externalData['hp']) ? (int) $externalData['hp'] : null,
            'colors' => $types, // Pokemon types (Fire, Water, etc.)
            'keywords' => [],
            'legalities' => $this->mapLegalities($externalData['legalities'] ?? []),
            'game_specific' => array_filter([
                'hp' => $externalData['hp'] ?? null,
                'level' => $externalData['level'] ?? null,
                'evolves_from' => $externalData['evolvesFrom'] ?? null,
                'evolves_to' => $externalData['evolvesTo'] ?? null,
                'abilities' => $externalData['abilities'] ?? null,
                'attacks' => $externalData['attacks'] ?? null,
                'weaknesses' => $externalData['weaknesses'] ?? null,
                'resistances' => $externalData['resistances'] ?? null,
                'retreat_cost' => $externalData['retreatCost'] ?? null,
                'converted_retreat_cost' => $externalData['convertedRetreatCost'] ?? null,
                'rules' => $externalData['rules'] ?? null,
                'ancient_trait' => $externalData['ancientTrait'] ?? null,
                'national_pokedex_numbers' => $externalData['nationalPokedexNumbers'] ?? null,
                'regulation_mark' => $externalData['regulationMark'] ?? null,
            ]),
            'external_ids' => array_filter([
                'pokemon_tcg_id' => $externalData['id'] ?? null,
            ]),
        ];
    }

    public function mapPrinting(array $externalData, UnifiedCard $card, ?UnifiedSet $set = null): array
    {
        $rarity = $externalData['rarity'] ?? null;

        // Extract set info from the ID (format: set-number)
        $idParts = explode('-', $externalData['id'] ?? '');
        $setCode = $idParts[0] ?? '';
        $number = $externalData['number'] ?? ($idParts[1] ?? '');

        return [
            'card_id' => $card->id,
            'set_id' => $set?->id,
            'set_code' => strtoupper($externalData['set']['id'] ?? $setCode),
            'set_name' => $externalData['set']['name'] ?? $set?->name ?? null,
            'collector_number' => $number,
            'rarity' => $rarity,
            'rarity_label' => self::RARITIES[$rarity] ?? $rarity,
            'finish' => 'standard', // Pokemon doesn't have foiling in the API
            'finish_label' => 'Standard',
            'language' => 'en', // API is English only
            'flavor_text' => $externalData['flavorText'] ?? null,
            'artist' => $externalData['artist'] ?? null,
            'image_url' => $externalData['images']['large'] ?? null,
            'image_url_small' => $externalData['images']['small'] ?? null,
            'image_url_back' => null,
            'is_promo' => str_contains(strtolower($rarity ?? ''), 'promo'),
            'is_reprint' => false,
            'is_variant' => false,
            'released_at' => $externalData['set']['releaseDate'] ?? null,
            'prices' => $this->mapPrices($externalData),
            'game_specific' => [],
            'external_ids' => array_filter([
                'pokemon_tcg_id' => $externalData['id'] ?? null,
            ]),
        ];
    }

    public function extractCardIdentifier(array $externalData): string
    {
        // For Pokemon, we use name as the card identifier since the same Pokemon
        // can appear in multiple sets with the same oracle text
        return $externalData['name'] ?? '';
    }

    public function extractPrintingIdentifier(array $externalData): string
    {
        return $externalData['id'] ?? '';
    }

    public function isValidCard(array $externalData): bool
    {
        return ! empty($externalData['name']);
    }

    public function getSupportedExtensions(): array
    {
        return ['json'];
    }

    protected function buildTypeLine(?string $supertype, array $subtypes, array $types): string
    {
        $parts = [];

        if ($supertype) {
            $parts[] = $supertype;
        }

        if (! empty($subtypes)) {
            $parts[] = implode(' ', $subtypes);
        }

        if (! empty($types)) {
            if (! empty($parts)) {
                $parts[] = '—';
            }
            $parts[] = implode('/', $types);
        }

        return implode(' ', $parts);
    }

    protected function buildCardText(array $data): ?string
    {
        $text = [];

        // Add abilities
        if (! empty($data['abilities'])) {
            foreach ($data['abilities'] as $ability) {
                $text[] = "[{$ability['type']}] {$ability['name']}: {$ability['text']}";
            }
        }

        // Add attacks
        if (! empty($data['attacks'])) {
            foreach ($data['attacks'] as $attack) {
                $cost = implode('', $attack['cost'] ?? []);
                $damage = $attack['damage'] ?? '';
                $attackText = "[{$cost}] {$attack['name']}";
                if ($damage) {
                    $attackText .= " ({$damage})";
                }
                if (! empty($attack['text'])) {
                    $attackText .= ": {$attack['text']}";
                }
                $text[] = $attackText;
            }
        }

        // Add rules
        if (! empty($data['rules'])) {
            $text = array_merge($text, $data['rules']);
        }

        return ! empty($text) ? implode("\n", $text) : null;
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
        $prices = [];

        if (! empty($data['tcgplayer']['prices'])) {
            $prices['tcgplayer'] = $data['tcgplayer']['prices'];
        }

        if (! empty($data['cardmarket']['prices'])) {
            $prices['cardmarket'] = $data['cardmarket']['prices'];
        }

        return ! empty($prices) ? $prices : null;
    }
}
