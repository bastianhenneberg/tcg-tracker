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
        Schema::create('deck_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_format_id')->constrained()->cascadeOnDelete();
            $table->string('slug', 50);
            $table->string('name', 100);
            $table->unsignedInteger('min_cards')->default(0);
            $table->unsignedInteger('max_cards')->nullable();
            $table->boolean('is_required')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['game_format_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deck_zones');
    }
};
