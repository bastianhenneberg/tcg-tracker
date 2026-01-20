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
            $table->unsignedTinyInteger('position_in_slot')->default(0)->after('binder_slot');
            $table->index(['binder_page_id', 'binder_slot', 'position_in_slot']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('unified_inventories', function (Blueprint $table) {
            $table->dropIndex(['binder_page_id', 'binder_slot', 'position_in_slot']);
            $table->dropColumn('position_in_slot');
        });
    }
};
