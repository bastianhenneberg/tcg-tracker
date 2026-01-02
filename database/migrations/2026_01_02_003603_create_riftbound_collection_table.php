<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('riftbound_collection', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('riftbound_printing_id')->constrained()->cascadeOnDelete();
            $table->string('condition', 10);
            $table->string('language', 10)->default('EN');
            $table->integer('quantity')->default(1);
            $table->text('notes')->nullable();
            $table->foreignId('source_lot_id')->nullable()->constrained('lots')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'riftbound_printing_id', 'condition', 'language'], 'riftbound_collection_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riftbound_collection');
    }
};
