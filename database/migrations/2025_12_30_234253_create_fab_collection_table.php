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
        Schema::create('fab_collection', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fab_printing_id')->constrained()->cascadeOnDelete();
            $table->string('condition', 5);
            $table->unsignedInteger('quantity')->default(1);
            $table->text('notes')->nullable();
            $table->foreignId('source_lot_id')->nullable()->constrained('lots')->nullOnDelete();
            $table->timestamps();

            $table->index('user_id');
            $table->unique(['user_id', 'fab_printing_id', 'condition']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fab_collection');
    }
};
