<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('riftbound_inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('riftbound_printing_id')->constrained()->cascadeOnDelete();
            $table->string('condition', 10);
            $table->string('language', 10)->default('EN');
            $table->decimal('price', 10, 2)->nullable();
            $table->integer('position_in_lot')->nullable();
            $table->timestamp('sold_at')->nullable();
            $table->decimal('sold_price', 10, 2)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'sold_at']);
            $table->index('lot_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riftbound_inventory');
    }
};
