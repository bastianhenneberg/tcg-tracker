<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Oracle cards table - unique card by oracle_id (the abstract card)
        Schema::create('mtg_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->nullable()->constrained()->nullOnDelete();
            $table->string('oracle_id', 36)->unique(); // Scryfall oracle ID
            $table->string('name');
            $table->string('mana_cost')->nullable(); // {2}{U}{B}
            $table->decimal('mana_value', 4, 1)->nullable(); // CMC/MV
            $table->string('type_line')->nullable(); // Full type line
            $table->text('oracle_text')->nullable(); // Rules text
            $table->string('power')->nullable(); // Can be '*', '1+*', etc.
            $table->string('toughness')->nullable();
            $table->string('loyalty')->nullable(); // For planeswalkers
            $table->string('defense')->nullable(); // For battles
            $table->json('colors')->nullable(); // ["W", "U", "B", "R", "G"]
            $table->json('color_identity')->nullable();
            $table->json('types')->nullable(); // ["Creature", "Artifact"]
            $table->json('subtypes')->nullable(); // ["Human", "Wizard"]
            $table->json('supertypes')->nullable(); // ["Legendary", "Snow"]
            $table->json('keywords')->nullable(); // ["Flying", "Trample"]
            $table->string('layout')->nullable(); // normal, split, flip, transform, etc.

            // Legalities - store as JSON for flexibility
            $table->json('legalities')->nullable();

            // EDHREC ranking for commander popularity
            $table->integer('edhrec_rank')->nullable();

            $table->timestamps();

            $table->index('name');
            $table->index('mana_value');
        });

        // Printings table - specific card in a specific set
        Schema::create('mtg_printings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mtg_card_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mtg_set_id')->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->unique(); // MTGJSON uuid
            $table->string('scryfall_id', 36)->nullable();
            $table->integer('multiverse_id')->nullable();
            $table->string('number', 20); // Collector number
            $table->string('rarity', 20); // common, uncommon, rare, mythic
            $table->string('artist')->nullable();
            $table->string('flavor_text', 1000)->nullable();
            $table->string('watermark')->nullable();
            $table->string('border_color', 20)->nullable();
            $table->string('frame_version', 10)->nullable();
            $table->json('finishes')->nullable(); // ["nonfoil", "foil", "etched"]
            $table->boolean('has_foil')->default(false);
            $table->boolean('has_non_foil')->default(true);
            $table->boolean('is_promo')->default(false);
            $table->boolean('is_full_art')->default(false);
            $table->boolean('is_textless')->default(false);
            $table->boolean('is_oversized')->default(false);
            $table->json('availability')->nullable(); // ["paper", "mtgo", "arena"]

            // External IDs for pricing/buying
            $table->integer('tcgplayer_product_id')->nullable();
            $table->integer('cardmarket_id')->nullable();
            $table->integer('mtgo_id')->nullable();
            $table->integer('arena_id')->nullable();

            // Image URL (can be constructed from scryfall_id)
            $table->string('image_url')->nullable();

            $table->timestamps();

            $table->index(['mtg_set_id', 'number']);
            $table->index('rarity');
            $table->index('scryfall_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mtg_printings');
        Schema::dropIfExists('mtg_cards');
    }
};
