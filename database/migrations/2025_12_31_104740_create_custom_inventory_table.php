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
        Schema::create('custom_inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('custom_printing_id')->constrained()->cascadeOnDelete();

            $table->string('condition', 10)->default('NM');
            $table->string('language', 10)->default('EN');
            $table->decimal('price', 10, 2)->nullable();
            $table->unsignedInteger('position_in_lot')->nullable();

            $table->timestamp('sold_at')->nullable();
            $table->decimal('sold_price', 10, 2)->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_inventory');
    }
};
