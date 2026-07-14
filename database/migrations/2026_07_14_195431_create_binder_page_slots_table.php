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
        Schema::create('binder_page_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('binder_page_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('slot'); // 1-9 for the 3x3 grid
            // The card this pocket is reserved for — held even when unowned (set template).
            $table->foreignId('printing_id')->constrained('unified_printings')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['binder_page_id', 'slot']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('binder_page_slots');
    }
};
