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
        Schema::create('unified_sets', function (Blueprint $table) {
            $table->id();
            $table->string('game', 50)->index();
            $table->string('code', 20)->index();
            $table->string('name');
            $table->string('set_type', 50)->nullable();
            $table->date('released_at')->nullable()->index();
            $table->integer('card_count')->nullable();
            $table->string('icon_url')->nullable();
            $table->json('game_specific')->nullable();
            $table->json('external_ids')->nullable();
            $table->timestamps();

            $table->unique(['game', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unified_sets');
    }
};
