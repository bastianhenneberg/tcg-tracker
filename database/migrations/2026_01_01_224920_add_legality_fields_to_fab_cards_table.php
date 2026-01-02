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
        Schema::table('fab_cards', function (Blueprint $table) {
            // Color (Red/Yellow/Blue/None)
            $table->string('color')->nullable()->after('name');

            // Blitz format
            $table->boolean('blitz_banned')->default(false)->after('blitz_legal');
            $table->boolean('blitz_suspended')->default(false)->after('blitz_banned');
            $table->boolean('blitz_living_legend')->default(false)->after('blitz_suspended');

            // Classic Constructed format
            $table->boolean('cc_banned')->default(false)->after('cc_legal');
            $table->boolean('cc_suspended')->default(false)->after('cc_banned');
            $table->boolean('cc_living_legend')->default(false)->after('cc_suspended');

            // Commoner format
            $table->boolean('commoner_banned')->default(false)->after('commoner_legal');
            $table->boolean('commoner_suspended')->default(false)->after('commoner_banned');

            // Living Legend format
            $table->boolean('ll_banned')->default(false)->after('ll_legal');
            $table->boolean('ll_restricted')->default(false)->after('ll_banned');

            // Silver Age format (new!)
            $table->boolean('silver_age_legal')->default(false)->after('ll_restricted');
            $table->boolean('silver_age_banned')->default(false)->after('silver_age_legal');

            // Ultimate Pit Fight format
            $table->boolean('upf_banned')->default(false)->after('silver_age_banned');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fab_cards', function (Blueprint $table) {
            $table->dropColumn([
                'color',
                'blitz_banned',
                'blitz_suspended',
                'blitz_living_legend',
                'cc_banned',
                'cc_suspended',
                'cc_living_legend',
                'commoner_banned',
                'commoner_suspended',
                'll_banned',
                'll_restricted',
                'silver_age_legal',
                'silver_age_banned',
                'upf_banned',
            ]);
        });
    }
};
