<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fab_collection', function (Blueprint $table) {
            $table->string('language', 2)->default('EN')->after('condition');
        });

        // Update unique index to include language
        Schema::table('fab_collection', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'fab_printing_id', 'condition']);
            $table->unique(['user_id', 'fab_printing_id', 'condition', 'language']);
        });
    }

    public function down(): void
    {
        Schema::table('fab_collection', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'fab_printing_id', 'condition', 'language']);
            $table->unique(['user_id', 'fab_printing_id', 'condition']);
        });

        Schema::table('fab_collection', function (Blueprint $table) {
            $table->dropColumn('language');
        });
    }
};
