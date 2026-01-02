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
        Schema::create('custom_printings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('custom_card_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('collector_number', 50)->nullable();
            $table->string('set_name')->nullable();
            $table->string('rarity', 20)->nullable();
            $table->string('foiling', 20)->nullable();
            $table->string('language', 10)->default('EN');
            $table->string('edition', 20)->nullable();
            $table->string('image_path', 500)->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_printings');
    }
};
