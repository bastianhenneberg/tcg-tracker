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
        Schema::create('mtg_sets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->nullable()->constrained()->nullOnDelete();
            $table->string('code', 10)->unique(); // Set code like 'MKM', 'LCI'
            $table->string('name');
            $table->string('type')->nullable(); // expansion, core, masters, etc.
            $table->date('release_date')->nullable();
            $table->integer('base_set_size')->nullable();
            $table->integer('total_set_size')->nullable();
            $table->boolean('is_foil_only')->default(false);
            $table->boolean('is_online_only')->default(false);
            $table->string('keyrune_code', 10)->nullable(); // Icon code
            $table->string('mtgo_code', 10)->nullable();
            $table->integer('tcgplayer_group_id')->nullable();
            $table->integer('mcm_id')->nullable();
            $table->string('mcm_name')->nullable();
            $table->json('languages')->nullable(); // Available languages
            $table->json('translations')->nullable(); // Set name translations
            $table->timestamps();

            $table->index('code');
            $table->index('release_date');
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mtg_sets');
    }
};
