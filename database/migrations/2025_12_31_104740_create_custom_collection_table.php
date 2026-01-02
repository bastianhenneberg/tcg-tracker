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
        Schema::create('custom_collection', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('custom_printing_id')->constrained()->cascadeOnDelete();

            $table->string('condition', 10)->default('NM');
            $table->string('language', 10)->default('EN');
            $table->unsignedInteger('quantity')->default(1);
            $table->text('notes')->nullable();
            $table->foreignId('source_lot_id')->nullable()->constrained('lots')->nullOnDelete();

            $table->timestamps();

            $table->unique(['user_id', 'custom_printing_id', 'condition', 'language']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_collection');
    }
};
