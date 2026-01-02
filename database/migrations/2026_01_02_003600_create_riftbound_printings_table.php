<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('riftbound_printings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('riftbound_card_id')->constrained()->cascadeOnDelete();
            $table->foreignId('riftbound_set_id')->constrained()->cascadeOnDelete();
            $table->string('collector_number')->nullable();
            $table->string('rarity', 20)->nullable();
            $table->string('foiling', 20)->nullable();
            $table->string('language', 10)->default('EN');
            $table->string('image_url')->nullable();
            $table->timestamps();

            $table->unique(['riftbound_card_id', 'riftbound_set_id', 'collector_number', 'foiling'], 'riftbound_printings_unique');
            $table->index('collector_number');
            $table->index('rarity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riftbound_printings');
    }
};
