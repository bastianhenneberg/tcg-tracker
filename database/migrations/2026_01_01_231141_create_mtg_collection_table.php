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
        Schema::create('mtg_collection', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mtg_printing_id')->constrained()->cascadeOnDelete();
            $table->string('condition', 10)->default('NM'); // NM, LP, MP, HP, DM
            $table->string('finish', 20)->default('nonfoil'); // nonfoil, foil, etched
            $table->string('language', 10)->default('en'); // en, de, fr, jp, etc.
            $table->integer('quantity')->default(1);
            $table->text('notes')->nullable();
            $table->foreignId('source_lot_id')->nullable()->constrained('lots')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'mtg_printing_id', 'condition', 'finish', 'language'], 'mtg_collection_unique');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mtg_collection');
    }
};
