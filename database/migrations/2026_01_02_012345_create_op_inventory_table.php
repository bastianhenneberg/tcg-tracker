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
        Schema::create('op_inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('op_printing_id')->constrained()->cascadeOnDelete();
            $table->string('condition', 5);
            $table->string('language', 5)->default('EN');
            $table->decimal('price', 10, 2)->nullable();
            $table->integer('position_in_lot')->nullable();
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
        Schema::dropIfExists('op_inventory');
    }
};
