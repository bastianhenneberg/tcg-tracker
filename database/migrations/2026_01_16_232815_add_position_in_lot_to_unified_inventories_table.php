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
        Schema::table('unified_inventories', function (Blueprint $table) {
            $table->unsignedInteger('position_in_lot')->nullable()->after('lot_id');
            $table->index(['lot_id', 'position_in_lot']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('unified_inventories', function (Blueprint $table) {
            $table->dropIndex(['lot_id', 'position_in_lot']);
            $table->dropColumn('position_in_lot');
        });
    }
};
