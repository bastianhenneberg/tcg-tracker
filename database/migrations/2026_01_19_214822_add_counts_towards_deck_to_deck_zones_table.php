<?php

use App\Models\DeckZone;
use App\Models\GameFormat;
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
        Schema::table('deck_zones', function (Blueprint $table) {
            $table->boolean('counts_towards_deck')->default(true)->after('is_required');
        });

        // Add "Maybe" zone to all game formats
        $formats = GameFormat::all();

        foreach ($formats as $format) {
            // Get the highest sort_order for this format
            $maxSortOrder = DeckZone::where('game_format_id', $format->id)->max('sort_order') ?? 0;

            DeckZone::updateOrCreate(
                [
                    'game_format_id' => $format->id,
                    'slug' => 'maybe',
                ],
                [
                    'name' => 'Maybe',
                    'min_cards' => 0,
                    'max_cards' => null,
                    'is_required' => false,
                    'counts_towards_deck' => false,
                    'sort_order' => $maxSortOrder + 1,
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove all "Maybe" zones
        DeckZone::where('slug', 'maybe')->delete();

        Schema::table('deck_zones', function (Blueprint $table) {
            $table->dropColumn('counts_towards_deck');
        });
    }
};
