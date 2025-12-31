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
        Schema::create('card_printings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_id')->constrained()->cascadeOnDelete();
            $table->foreignId('card_set_id')->constrained()->cascadeOnDelete();
            $table->string('external_id')->index();
            $table->string('collector_number')->nullable();
            $table->string('rarity')->nullable();
            $table->string('foiling')->nullable();
            $table->string('image_url')->nullable();
            $table->json('data')->nullable();
            $table->timestamps();

            $table->unique(['card_id', 'external_id']);
            $table->index('collector_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('card_printings');
    }
};
