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
        Schema::create('op_collection', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('op_printing_id')->constrained()->cascadeOnDelete();
            $table->string('condition', 5);
            $table->string('language', 5)->default('EN');
            $table->integer('quantity')->default(1);
            $table->text('notes')->nullable();
            $table->foreignId('source_lot_id')->nullable()
                ->constrained('lots')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'op_printing_id', 'condition', 'language'], 'op_collection_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('op_collection');
    }
};
