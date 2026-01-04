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
        Schema::create('unified_cards', function (Blueprint $table) {
            $table->id();
            $table->string('game', 50)->index();
            $table->string('name');
            $table->string('name_normalized')->index();
            $table->string('type_line')->nullable();
            $table->json('types')->nullable();
            $table->json('subtypes')->nullable();
            $table->json('supertypes')->nullable();
            $table->text('text')->nullable();
            $table->text('text_normalized')->nullable();
            $table->string('cost', 50)->nullable();
            $table->string('power', 20)->nullable();
            $table->string('defense', 20)->nullable();
            $table->integer('health')->nullable();
            $table->json('colors')->nullable();
            $table->json('keywords')->nullable();
            $table->json('legalities')->nullable();
            $table->json('game_specific')->nullable();
            $table->json('external_ids')->nullable();
            $table->timestamps();

            $table->index(['game', 'name_normalized']);
        });

        // Fulltext index only for MySQL/MariaDB
        if (in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'])) {
            Schema::table('unified_cards', function (Blueprint $table) {
                $table->fullText(['name', 'text'], 'unified_cards_fulltext');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unified_cards');
    }
};
