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
        Schema::create('unified_printings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_id')->constrained('unified_cards')->cascadeOnDelete();
            $table->foreignId('set_id')->nullable()->constrained('unified_sets')->nullOnDelete();
            $table->string('set_code', 20)->index();
            $table->string('set_name')->nullable();
            $table->string('collector_number', 20);
            $table->string('rarity', 20)->nullable()->index();
            $table->string('rarity_label', 50)->nullable();
            $table->string('finish', 20)->nullable()->index();
            $table->string('finish_label', 50)->nullable();
            $table->string('language', 5)->default('en')->index();
            $table->text('flavor_text')->nullable();
            $table->string('artist')->nullable();
            $table->string('image_url')->nullable();
            $table->string('image_url_small')->nullable();
            $table->string('image_url_back')->nullable();
            $table->boolean('is_promo')->default(false)->index();
            $table->boolean('is_reprint')->default(false);
            $table->boolean('is_variant')->default(false);
            $table->date('released_at')->nullable();
            $table->json('prices')->nullable();
            $table->json('game_specific')->nullable();
            $table->json('external_ids')->nullable();
            $table->timestamps();

            $table->index(['card_id', 'set_code', 'collector_number']);
            $table->unique(['card_id', 'set_code', 'collector_number', 'finish', 'language'], 'unified_printings_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unified_printings');
    }
};
