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
        Schema::create('custom_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('external_id', 100)->nullable();

            // Generic card attributes (game-agnostic)
            $table->json('attributes')->nullable(); // Spielspezifische Attribute (pitch, cost, etc.)
            $table->json('types')->nullable();
            $table->json('traits')->nullable();
            $table->json('card_keywords')->nullable();
            $table->text('functional_text')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'game_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_cards');
    }
};
