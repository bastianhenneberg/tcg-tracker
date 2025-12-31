<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Migrate card_sets → fab_sets
        $sets = DB::table('card_sets')->get();
        $setIdMap = [];

        foreach ($sets as $set) {
            $newId = DB::table('fab_sets')->insertGetId([
                'external_id' => $set->external_id,
                'name' => $set->name,
                'released_at' => $set->released_at,
                'created_at' => $set->created_at,
                'updated_at' => $set->updated_at,
            ]);
            $setIdMap[$set->id] = $newId;
        }

        // Step 2: Migrate cards → fab_cards
        $cards = DB::table('cards')->get();
        $cardIdMap = [];

        foreach ($cards as $card) {
            $data = json_decode($card->data, true) ?? [];

            $newId = DB::table('fab_cards')->insertGetId([
                'external_id' => $card->external_id,
                'name' => $card->name,
                'pitch' => isset($data['pitch']) && $data['pitch'] !== '' ? (int) $data['pitch'] : null,
                'cost' => $data['cost'] ?? null,
                'power' => $data['power'] ?? null,
                'defense' => $data['defense'] ?? null,
                'health' => isset($data['health']) && $data['health'] !== '' ? (int) $data['health'] : null,
                'intelligence' => isset($data['intelligence']) && $data['intelligence'] !== '' ? (int) $data['intelligence'] : null,
                'arcane' => isset($data['arcane']) && $data['arcane'] !== '' ? (int) $data['arcane'] : null,
                'types' => isset($data['types']) ? json_encode($data['types']) : null,
                'traits' => isset($data['traits']) ? json_encode($data['traits']) : null,
                'card_keywords' => isset($data['card_keywords']) ? json_encode($data['card_keywords']) : null,
                'abilities_and_effects' => isset($data['abilities_and_effects']) ? json_encode($data['abilities_and_effects']) : null,
                'functional_text' => $data['functional_text'] ?? null,
                'functional_text_plain' => $data['functional_text_plain'] ?? null,
                'type_text' => $data['type_text'] ?? null,
                'played_horizontally' => $data['played_horizontally'] ?? false,
                'blitz_legal' => $data['blitz_legal'] ?? false,
                'cc_legal' => $data['cc_legal'] ?? false,
                'commoner_legal' => $data['commoner_legal'] ?? false,
                'll_legal' => $data['ll_legal'] ?? false,
                'created_at' => $card->created_at,
                'updated_at' => $card->updated_at,
            ]);
            $cardIdMap[$card->id] = $newId;
        }

        // Step 3: Migrate card_printings → fab_printings
        $printings = DB::table('card_printings')->get();
        $printingIdMap = [];

        foreach ($printings as $printing) {
            $data = json_decode($printing->data, true) ?? [];

            // Skip if we don't have a valid card or set mapping
            if (! isset($cardIdMap[$printing->card_id]) || ! isset($setIdMap[$printing->card_set_id])) {
                continue;
            }

            $newId = DB::table('fab_printings')->insertGetId([
                'fab_card_id' => $cardIdMap[$printing->card_id],
                'fab_set_id' => $setIdMap[$printing->card_set_id],
                'external_id' => $printing->external_id,
                'collector_number' => $printing->collector_number,
                'rarity' => $printing->rarity,
                'foiling' => $printing->foiling,
                'language' => $printing->language ?? 'EN',
                'edition' => $data['edition'] ?? null,
                'image_url' => $printing->image_url,
                'artists' => isset($data['artists']) ? json_encode($data['artists']) : null,
                'flavor_text' => $data['flavor_text'] ?? null,
                'flavor_text_plain' => $data['flavor_text_plain'] ?? null,
                'tcgplayer_product_id' => $data['tcgplayer_product_id'] ?? null,
                'tcgplayer_url' => $data['tcgplayer_url'] ?? null,
                'created_at' => $printing->created_at,
                'updated_at' => $printing->updated_at,
            ]);
            $printingIdMap[$printing->id] = $newId;
        }

        // Step 4: Migrate inventory_cards → fab_inventory
        $inventoryItems = DB::table('inventory_cards')->get();

        foreach ($inventoryItems as $item) {
            // Skip if we don't have a valid printing mapping
            if (! isset($printingIdMap[$item->card_printing_id])) {
                continue;
            }

            DB::table('fab_inventory')->insert([
                'user_id' => $item->user_id,
                'lot_id' => $item->lot_id,
                'fab_printing_id' => $printingIdMap[$item->card_printing_id],
                'condition' => $item->condition,
                'price' => $item->price,
                'position_in_lot' => $item->position_in_lot,
                'sold_at' => $item->sold_at,
                'sold_price' => $item->sold_price,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ]);
        }

        // Step 5: Migrate collection_cards → fab_collection
        $collectionItems = DB::table('collection_cards')->get();

        foreach ($collectionItems as $item) {
            // Skip if we don't have a valid printing mapping
            if (! isset($printingIdMap[$item->card_printing_id])) {
                continue;
            }

            DB::table('fab_collection')->insert([
                'user_id' => $item->user_id,
                'fab_printing_id' => $printingIdMap[$item->card_printing_id],
                'condition' => $item->condition,
                'quantity' => $item->quantity,
                'notes' => $item->notes,
                'source_lot_id' => $item->source_lot_id,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Clear all fab tables in reverse order
        DB::table('fab_collection')->truncate();
        DB::table('fab_inventory')->truncate();
        DB::table('fab_printings')->truncate();
        DB::table('fab_cards')->truncate();
        DB::table('fab_sets')->truncate();
    }
};
