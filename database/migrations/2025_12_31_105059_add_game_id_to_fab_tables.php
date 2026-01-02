<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('fab_cards', function (Blueprint $table) {
            $table->foreignId('game_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        Schema::table('fab_sets', function (Blueprint $table) {
            $table->foreignId('game_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        // Set game_id = 1 (FaB) for existing records
        DB::table('fab_cards')->update(['game_id' => 1]);
        DB::table('fab_sets')->update(['game_id' => 1]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fab_cards', function (Blueprint $table) {
            $table->dropForeign(['game_id']);
            $table->dropColumn('game_id');
        });

        Schema::table('fab_sets', function (Blueprint $table) {
            $table->dropForeign(['game_id']);
            $table->dropColumn('game_id');
        });
    }
};
