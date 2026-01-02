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
        Schema::table('custom_cards', function (Blueprint $table) {
            // Link to main FaB card (for variants/translations)
            $table->foreignId('linked_fab_card_id')
                ->nullable()
                ->after('game_id')
                ->constrained('fab_cards')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('custom_cards', function (Blueprint $table) {
            $table->dropConstrainedForeignId('linked_fab_card_id');
        });
    }
};
