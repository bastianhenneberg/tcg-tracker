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
        Schema::create('unified_inventories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('printing_id')->constrained('unified_printings')->cascadeOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('box_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('quantity')->default(1);
            $table->string('condition', 10)->default('NM');
            $table->string('language', 5)->default('en');
            $table->text('notes')->nullable();
            $table->decimal('purchase_price', 10, 2)->nullable();
            $table->string('purchase_currency', 3)->nullable();
            $table->date('purchased_at')->nullable();
            $table->boolean('in_collection')->default(false)->index();
            $table->json('extra')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'printing_id']);
            $table->index(['user_id', 'in_collection']);
            $table->index(['user_id', 'lot_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unified_inventories');
    }
};
