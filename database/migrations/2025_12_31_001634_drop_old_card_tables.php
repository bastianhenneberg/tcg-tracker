<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop in correct order due to foreign key constraints
        Schema::dropIfExists('collection_cards');
        Schema::dropIfExists('inventory_cards');
        Schema::dropIfExists('card_printings');
        Schema::dropIfExists('cards');
        Schema::dropIfExists('card_sets');
        Schema::dropIfExists('card_games');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot restore dropped tables - would need to recreate them
        // This migration is intentionally irreversible
    }
};
