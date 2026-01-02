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
        Schema::create('op_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->nullable()->constrained()->nullOnDelete();
            $table->string('external_id')->unique(); // z.B. "OP01-001"
            $table->string('name');
            $table->string('card_type'); // Leader, Character, Event, Stage
            $table->string('color'); // Red, Green, Blue, Purple, Black, Yellow
            $table->string('color_secondary')->nullable(); // Für Dual-Color Karten
            $table->integer('cost')->nullable(); // Spielkosten
            $table->integer('power')->nullable(); // Stärke
            $table->integer('life')->nullable(); // Leben (für Leader)
            $table->integer('counter')->nullable(); // Counter-Wert
            $table->string('attribute')->nullable(); // Slash, Strike, Ranged, Special, Wisdom
            $table->json('types')->nullable(); // Typen wie "Straw Hat Crew", "Navy"
            $table->text('effect')->nullable(); // Karteneffekt
            $table->text('trigger')->nullable(); // Trigger-Effekt
            $table->timestamps();

            $table->index('name');
            $table->index('card_type');
            $table->index('color');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('op_cards');
    }
};
