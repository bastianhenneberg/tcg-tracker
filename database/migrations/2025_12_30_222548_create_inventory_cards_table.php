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
        Schema::create('inventory_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lot_id')->constrained()->cascadeOnDelete();
            $table->foreignId('card_printing_id')->constrained()->cascadeOnDelete();
            $table->string('condition')->default('NM');
            $table->decimal('price', 10, 2)->nullable();
            $table->unsignedInteger('position_in_lot')->nullable();
            $table->timestamp('sold_at')->nullable();
            $table->decimal('sold_price', 10, 2)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'sold_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_cards');
    }
};
