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
        Schema::create('fab_printings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fab_card_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fab_set_id')->constrained()->cascadeOnDelete();
            $table->string('external_id')->unique();
            $table->string('collector_number', 20);
            $table->string('rarity', 5)->nullable();
            $table->string('foiling', 5)->nullable();
            $table->string('language', 5)->default('EN');
            $table->string('edition', 5)->nullable();
            $table->string('image_url')->nullable();
            $table->json('artists')->nullable();
            $table->text('flavor_text')->nullable();
            $table->text('flavor_text_plain')->nullable();
            $table->string('tcgplayer_product_id')->nullable();
            $table->string('tcgplayer_url')->nullable();
            $table->timestamps();

            $table->index('collector_number');
            $table->index(['fab_card_id', 'fab_set_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fab_printings');
    }
};
