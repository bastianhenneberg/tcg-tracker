<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fab_inventory', function (Blueprint $table) {
            $table->string('language', 2)->default('EN')->after('condition');
        });
    }

    public function down(): void
    {
        Schema::table('fab_inventory', function (Blueprint $table) {
            $table->dropColumn('language');
        });
    }
};
