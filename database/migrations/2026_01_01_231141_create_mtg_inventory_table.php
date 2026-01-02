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
        Schema::create('mtg_inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lot_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mtg_printing_id')->constrained()->cascadeOnDelete();
            $table->string('condition', 10)->default('NM');
            $table->string('finish', 20)->default('nonfoil');
            $table->string('language', 10)->default('en');
            $table->decimal('price', 10, 2)->nullable();
            $table->integer('position_in_lot')->default(0);
            $table->timestamp('sold_at')->nullable();
            $table->decimal('sold_price', 10, 2)->nullable();
            $table->timestamps();

            $table->index('lot_id');
            $table->index(['user_id', 'sold_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mtg_inventory');
    }
};
