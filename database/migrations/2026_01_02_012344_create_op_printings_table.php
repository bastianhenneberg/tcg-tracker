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
        Schema::create('op_printings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('op_card_id')->constrained()->cascadeOnDelete();
            $table->foreignId('op_set_id')->constrained()->cascadeOnDelete();
            $table->string('external_id')->unique(); // API card_image_id
            $table->string('collector_number', 20); // z.B. "001", "001_p1"
            $table->string('rarity', 10)->nullable(); // L, C, UC, R, SR, SEC, SP
            $table->boolean('is_alternate_art')->default(false);
            $table->string('language', 5)->default('EN');
            $table->string('image_url')->nullable();
            $table->timestamps();

            $table->index('collector_number');
            $table->index('rarity');
            $table->index(['op_card_id', 'op_set_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('op_printings');
    }
};
