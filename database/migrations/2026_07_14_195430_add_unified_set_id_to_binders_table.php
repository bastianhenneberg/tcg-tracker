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
        Schema::table('binders', function (Blueprint $table) {
            // Optional link to a set; a binder can still be a freeform binder without one.
            $table->foreignId('unified_set_id')->nullable()->after('name')->constrained('unified_sets')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('binders', function (Blueprint $table) {
            $table->dropForeign(['unified_set_id']);
            $table->dropColumn('unified_set_id');
        });
    }
};
