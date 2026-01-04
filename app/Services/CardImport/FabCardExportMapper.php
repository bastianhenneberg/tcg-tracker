<?php

namespace App\Services\CardImport;

use App\Contracts\CardImport\CardExportMapperInterface;
use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use App\Models\UnifiedSet;

class FabCardExportMapper implements CardExportMapperInterface
{
    public function getGameSlug(): string
    {
        return 'fab';
    }

    public function exportSet(UnifiedSet $set): array
    {
        $gameSpecific = $set->game_specific ?? [];

        return [
            'id' => $set->code,
            'name' => $set->name,
            'set_type' => $set->set_type,
            'release_date' => $set->released_at?->toDateString(),
            'card_count' => $set->card_count,
            'icon_url' => $set->icon_url,
            'edition' => $gameSpecific['edition'] ?? null,
            'printings_count' => $gameSpecific['printings_count'] ?? null,
        ];
    }

    public function exportCard(UnifiedCard $card): array
    {
        $gameSpecific = $card->game_specific ?? [];
        $legalities = $card->legalities ?? [];

        return [
            'unique_id' => $card->external_ids['fab_id'] ?? $card->id,
            'name' => $card->name,
            'type_text' => $card->type_line,
            'types' => $card->types ?? [],
            'traits' => $card->subtypes ?? [],
            'functional_text' => $card->text,
            'cost' => $card->cost,
            'power' => $card->power,
            'defense' => $card->defense,
            'health' => $card->health,
            'pitch' => $gameSpecific['pitch'] ?? null,
            'intelligence' => $gameSpecific['intelligence'] ?? null,
            'arcane' => $gameSpecific['arcane'] ?? null,
            'color' => $gameSpecific['color'] ?? null,
            'card_keywords' => $card->keywords ?? [],
            'abilities_and_effects' => $gameSpecific['abilities_and_effects'] ?? [],
            'played_horizontally' => $gameSpecific['played_horizontally'] ?? false,
            // Legalities
            'blitz_legal' => isset($legalities['blitz']),
            'blitz_banned' => ($legalities['blitz'] ?? null) === 'banned',
            'blitz_suspended' => ($legalities['blitz'] ?? null) === 'suspended',
            'blitz_living_legend' => ($legalities['blitz'] ?? null) === 'living_legend',
            'cc_legal' => isset($legalities['cc']),
            'cc_banned' => ($legalities['cc'] ?? null) === 'banned',
            'cc_suspended' => ($legalities['cc'] ?? null) === 'suspended',
            'cc_living_legend' => ($legalities['cc'] ?? null) === 'living_legend',
            'commoner_legal' => isset($legalities['commoner']),
            'commoner_banned' => ($legalities['commoner'] ?? null) === 'banned',
            'commoner_suspended' => ($legalities['commoner'] ?? null) === 'suspended',
            'll_legal' => isset($legalities['ll']),
            'll_banned' => ($legalities['ll'] ?? null) === 'banned',
            'll_restricted' => ($legalities['ll'] ?? null) === 'restricted',
        ];
    }

    public function exportPrinting(UnifiedPrinting $printing): array
    {
        $gameSpecific = $printing->game_specific ?? [];

        return [
            'unique_id' => $printing->external_ids['fab_printing_id'] ?? $printing->id,
            'card_unique_id' => $printing->card->external_ids['fab_id'] ?? $printing->card_id,
            'set_id' => $printing->set_code,
            'set_name' => $printing->set_name,
            'collector_number' => $printing->collector_number,
            'rarity' => $printing->rarity,
            'foiling' => $printing->finish,
            'language' => strtoupper($printing->language),
            'edition' => $gameSpecific['edition'] ?? null,
            'image_url' => $printing->image_url,
            'artists' => $printing->artist ? explode(', ', $printing->artist) : [],
            'flavor_text' => $printing->flavor_text,
            'tcgplayer_product_id' => $gameSpecific['tcgplayer_product_id'] ?? null,
            'tcgplayer_url' => $gameSpecific['tcgplayer_url'] ?? null,
        ];
    }

    public function getSupportedFormats(): array
    {
        return ['json', 'csv'];
    }
}
