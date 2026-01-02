<?php

namespace Database\Seeders;

use App\Models\Fab\FabPrinting;
use App\Models\Game;
use App\Models\GameAttribute;
use App\Models\GameFormat;
use Illuminate\Database\Seeder;

class GamesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Flesh and Blood as official game
        $fab = Game::updateOrCreate(
            ['slug' => 'fab'],
            [
                'name' => 'Flesh and Blood',
                'description' => 'Flesh and Blood is a hero versus hero combat trading card game.',
                'logo_url' => null,
                'is_official' => true,
                'user_id' => null,
            ]
        );

        $this->seedFabAttributes($fab);
        $this->seedFabFormats($fab);

        // Create Magic: The Gathering as official game
        $mtg = Game::updateOrCreate(
            ['slug' => 'magic-the-gathering'],
            [
                'name' => 'Magic: The Gathering',
                'description' => 'The original trading card game by Wizards of the Coast.',
                'logo_url' => null,
                'is_official' => true,
                'user_id' => null,
            ]
        );

        $this->seedMtgAttributes($mtg);
        $this->seedMtgFormats($mtg);

        // Create Riftbound as official game
        $riftbound = Game::updateOrCreate(
            ['slug' => 'riftbound'],
            [
                'name' => 'Riftbound',
                'description' => 'A fantasy trading card game featuring heroes and domains.',
                'logo_url' => null,
                'is_official' => true,
                'user_id' => null,
            ]
        );

        $this->seedRiftboundAttributes($riftbound);
        $this->seedRiftboundFormats($riftbound);
    }

    private function seedFabAttributes(Game $game): void
    {
        $sortOrder = 0;

        // Rarities
        foreach (FabPrinting::RARITIES as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_RARITY, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }

        // Foilings
        $sortOrder = 0;
        foreach (FabPrinting::FOILINGS as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_FOILING, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }

        // Languages
        $sortOrder = 0;
        foreach (FabPrinting::LANGUAGES as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_LANGUAGE, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }

        // Editions
        $sortOrder = 0;
        foreach (FabPrinting::EDITIONS as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_EDITION, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }

        // Conditions (standard TCG conditions)
        $conditions = [
            'NM' => 'Near Mint',
            'LP' => 'Lightly Played',
            'MP' => 'Moderately Played',
            'HP' => 'Heavily Played',
            'DM' => 'Damaged',
        ];

        $sortOrder = 0;
        foreach ($conditions as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_CONDITION, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }
    }

    private function seedFabFormats(Game $game): void
    {
        $formats = [
            [
                'slug' => 'blitz',
                'name' => 'Blitz',
                'description' => 'Fast-paced format with a young hero and 40-card deck. Max 2 copies per card.',
                'is_active' => true,
                'sort_order' => 0,
            ],
            [
                'slug' => 'classic-constructed',
                'name' => 'Classic Constructed',
                'description' => 'Standard competitive format with adult hero and 60+ card deck. Max 3 copies per card.',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'slug' => 'commoner',
                'name' => 'Commoner',
                'description' => 'Budget-friendly format using only Common and Rare cards.',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'slug' => 'living-legend',
                'name' => 'Living Legend',
                'description' => 'Eternal format where retired heroes can still compete.',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'slug' => 'draft',
                'name' => 'Draft',
                'description' => 'Limited format where players draft cards from booster packs.',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'slug' => 'sealed',
                'name' => 'Sealed',
                'description' => 'Limited format where players build decks from sealed product.',
                'is_active' => true,
                'sort_order' => 5,
            ],
        ];

        foreach ($formats as $format) {
            GameFormat::updateOrCreate(
                ['game_id' => $game->id, 'slug' => $format['slug']],
                $format
            );
        }
    }

    private function seedMtgAttributes(Game $game): void
    {
        // Rarities for MTG
        $rarities = [
            'common' => 'Common',
            'uncommon' => 'Uncommon',
            'rare' => 'Rare',
            'mythic' => 'Mythic Rare',
            'special' => 'Special',
            'bonus' => 'Bonus',
        ];

        $sortOrder = 0;
        foreach ($rarities as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_RARITY, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }

        // Finishes (MTG uses "finish" instead of foiling)
        $finishes = [
            'nonfoil' => 'Non-Foil',
            'foil' => 'Foil',
            'etched' => 'Etched Foil',
        ];

        $sortOrder = 0;
        foreach ($finishes as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_FOILING, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }

        // Languages
        $languages = [
            'en' => 'English',
            'de' => 'German',
            'fr' => 'French',
            'it' => 'Italian',
            'es' => 'Spanish',
            'pt' => 'Portuguese',
            'jp' => 'Japanese',
            'ko' => 'Korean',
            'ru' => 'Russian',
            'zhs' => 'Chinese Simplified',
            'zht' => 'Chinese Traditional',
        ];

        $sortOrder = 0;
        foreach ($languages as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_LANGUAGE, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }

        // Conditions (standard TCG conditions)
        $conditions = [
            'NM' => 'Near Mint',
            'LP' => 'Lightly Played',
            'MP' => 'Moderately Played',
            'HP' => 'Heavily Played',
            'DM' => 'Damaged',
        ];

        $sortOrder = 0;
        foreach ($conditions as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_CONDITION, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }
    }

    private function seedMtgFormats(Game $game): void
    {
        $formats = [
            [
                'slug' => 'standard',
                'name' => 'Standard',
                'description' => 'Rotating format featuring recent sets. Max 4 copies per card.',
                'is_active' => true,
                'sort_order' => 0,
            ],
            [
                'slug' => 'pioneer',
                'name' => 'Pioneer',
                'description' => 'Non-rotating format from Return to Ravnica onwards.',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'slug' => 'modern',
                'name' => 'Modern',
                'description' => 'Non-rotating format from 8th Edition onwards.',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'slug' => 'legacy',
                'name' => 'Legacy',
                'description' => 'Eternal format with a banned list. All cards legal.',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'slug' => 'vintage',
                'name' => 'Vintage',
                'description' => 'Eternal format with restricted list. Most powerful format.',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'slug' => 'commander',
                'name' => 'Commander (EDH)',
                'description' => 'Singleton 100-card format with a commander. Max 1 copy per card.',
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'slug' => 'pauper',
                'name' => 'Pauper',
                'description' => 'Budget format using only common cards.',
                'is_active' => true,
                'sort_order' => 6,
            ],
            [
                'slug' => 'draft',
                'name' => 'Draft',
                'description' => 'Limited format where players draft cards from booster packs.',
                'is_active' => true,
                'sort_order' => 7,
            ],
            [
                'slug' => 'sealed',
                'name' => 'Sealed',
                'description' => 'Limited format where players build decks from sealed product.',
                'is_active' => true,
                'sort_order' => 8,
            ],
        ];

        foreach ($formats as $format) {
            GameFormat::updateOrCreate(
                ['game_id' => $game->id, 'slug' => $format['slug']],
                $format
            );
        }
    }

    private function seedRiftboundAttributes(Game $game): void
    {
        // Rarities for Riftbound
        $rarities = [
            'C' => 'Common',
            'U' => 'Uncommon',
            'R' => 'Rare',
            'E' => 'Epic',
            'O' => 'Overnumbered',
            'P' => 'Promo',
        ];

        $sortOrder = 0;
        foreach ($rarities as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_RARITY, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }

        // Foilings
        $foilings = [
            'N' => 'Non-Foil',
            'F' => 'Foil',
            'O' => 'Overnumbered Foil',
            'A' => 'Alternate Art',
        ];

        $sortOrder = 0;
        foreach ($foilings as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_FOILING, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }

        // Languages
        $languages = [
            'EN' => 'English',
        ];

        $sortOrder = 0;
        foreach ($languages as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_LANGUAGE, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }

        // Conditions (standard TCG conditions)
        $conditions = [
            'NM' => 'Near Mint',
            'LP' => 'Lightly Played',
            'MP' => 'Moderately Played',
            'HP' => 'Heavily Played',
            'DM' => 'Damaged',
        ];

        $sortOrder = 0;
        foreach ($conditions as $key => $label) {
            GameAttribute::updateOrCreate(
                ['game_id' => $game->id, 'type' => GameAttribute::TYPE_CONDITION, 'key' => $key],
                ['label' => $label, 'sort_order' => $sortOrder++]
            );
        }
    }

    private function seedRiftboundFormats(Game $game): void
    {
        $formats = [
            [
                'slug' => 'constructed',
                'name' => 'Constructed',
                'description' => 'Standard constructed format with a 40-card minimum deck.',
                'is_active' => true,
                'sort_order' => 0,
            ],
            [
                'slug' => 'draft',
                'name' => 'Draft',
                'description' => 'Limited format where players draft cards from booster packs.',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'slug' => 'sealed',
                'name' => 'Sealed',
                'description' => 'Limited format where players build decks from sealed product.',
                'is_active' => true,
                'sort_order' => 2,
            ],
        ];

        foreach ($formats as $format) {
            GameFormat::updateOrCreate(
                ['game_id' => $game->id, 'slug' => $format['slug']],
                $format
            );
        }
    }
}
