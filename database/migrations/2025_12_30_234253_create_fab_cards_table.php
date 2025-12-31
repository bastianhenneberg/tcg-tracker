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
        Schema::create('fab_cards', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->string('name');
            $table->tinyInteger('pitch')->nullable();
            $table->string('cost', 10)->nullable();
            $table->string('power', 10)->nullable();
            $table->string('defense', 10)->nullable();
            $table->integer('health')->nullable();
            $table->integer('intelligence')->nullable();
            $table->integer('arcane')->nullable();
            $table->json('types')->nullable();
            $table->json('traits')->nullable();
            $table->json('card_keywords')->nullable();
            $table->json('abilities_and_effects')->nullable();
            $table->text('functional_text')->nullable();
            $table->text('functional_text_plain')->nullable();
            $table->string('type_text')->nullable();
            $table->boolean('played_horizontally')->default(false);
            $table->boolean('blitz_legal')->default(false);
            $table->boolean('cc_legal')->default(false);
            $table->boolean('commoner_legal')->default(false);
            $table->boolean('ll_legal')->default(false);
            $table->timestamps();

            $table->index('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fab_cards');
    }
};
