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
            $table->foreignId('binder_id')->nullable()->after('box_id')->constrained()->nullOnDelete();
            $table->foreignId('binder_page_id')->nullable()->after('binder_id')->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('binder_slot')->nullable()->after('binder_page_id'); // 1-9 für 3x3 Grid

            $table->index(['user_id', 'binder_id']);
            $table->index(['binder_page_id', 'binder_slot']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('unified_inventories', function (Blueprint $table) {
            $table->dropForeign(['binder_id']);
            $table->dropForeign(['binder_page_id']);
            $table->dropIndex(['user_id', 'binder_id']);
            $table->dropIndex(['binder_page_id', 'binder_slot']);
            $table->dropColumn(['binder_id', 'binder_page_id', 'binder_slot']);
        });
    }
};
