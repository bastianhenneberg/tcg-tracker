<?php

namespace Database\Seeders;

use App\Models\DeckZone;
use App\Models\GameFormat;
use Illuminate\Database\Seeder;

class DeckZonesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $zoneDefinitions = $this->getZoneDefinitions();

        foreach ($zoneDefinitions as $gameSlug => $formats) {
            foreach ($formats as $formatSlug => $zones) {
                $format = GameFormat::whereHas('game', fn ($q) => $q->where('slug', $gameSlug))
                    ->where('slug', $formatSlug)
                    ->first();

                if (! $format) {
                    $this->command->warn("Format not found: {$gameSlug}/{$formatSlug}");

                    continue;
                }

                foreach ($zones as $sortOrder => $zone) {
                    DeckZone::updateOrCreate(
                        [
                            'game_format_id' => $format->id,
                            'slug' => $zone['slug'],
                        ],
                        [
                            'name' => $zone['name'],
                            'min_cards' => $zone['min_cards'],
                            'max_cards' => $zone['max_cards'],
                            'is_required' => $zone['is_required'],
                            'sort_order' => $sortOrder,
                        ]
                    );
                }
            }
        }
    }

    private function getZoneDefinitions(): array
    {
        return [
            // Flesh and Blood
            'fab' => [
                'blitz' => [
                    ['slug' => 'hero', 'name' => 'Hero', 'min_cards' => 1, 'max_cards' => 1, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 40, 'max_cards' => 40, 'is_required' => true],
                    ['slug' => 'equipment', 'name' => 'Equipment', 'min_cards' => 0, 'max_cards' => 11, 'is_required' => false],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => null, 'is_required' => false],
                ],
                'classic-constructed' => [
                    ['slug' => 'hero', 'name' => 'Hero', 'min_cards' => 1, 'max_cards' => 1, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 60, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'equipment', 'name' => 'Equipment', 'min_cards' => 0, 'max_cards' => 11, 'is_required' => false],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => null, 'is_required' => false],
                ],
                'commoner' => [
                    ['slug' => 'hero', 'name' => 'Hero', 'min_cards' => 1, 'max_cards' => 1, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 40, 'max_cards' => 40, 'is_required' => true],
                    ['slug' => 'equipment', 'name' => 'Equipment', 'min_cards' => 0, 'max_cards' => 11, 'is_required' => false],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => null, 'is_required' => false],
                ],
                'living-legend' => [
                    ['slug' => 'hero', 'name' => 'Hero', 'min_cards' => 1, 'max_cards' => 1, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 60, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'equipment', 'name' => 'Equipment', 'min_cards' => 0, 'max_cards' => 11, 'is_required' => false],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => null, 'is_required' => false],
                ],
                'draft' => [
                    ['slug' => 'hero', 'name' => 'Hero', 'min_cards' => 1, 'max_cards' => 1, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 30, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'equipment', 'name' => 'Equipment', 'min_cards' => 0, 'max_cards' => null, 'is_required' => false],
                ],
                'sealed' => [
                    ['slug' => 'hero', 'name' => 'Hero', 'min_cards' => 1, 'max_cards' => 1, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 30, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'equipment', 'name' => 'Equipment', 'min_cards' => 0, 'max_cards' => null, 'is_required' => false],
                ],
            ],

            // Magic: The Gathering
            'magic-the-gathering' => [
                'standard' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 60, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => 15, 'is_required' => false],
                ],
                'pioneer' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 60, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => 15, 'is_required' => false],
                ],
                'modern' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 60, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => 15, 'is_required' => false],
                ],
                'legacy' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 60, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => 15, 'is_required' => false],
                ],
                'vintage' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 60, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => 15, 'is_required' => false],
                ],
                'commander' => [
                    ['slug' => 'commander', 'name' => 'Commander', 'min_cards' => 1, 'max_cards' => 2, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 99, 'max_cards' => 99, 'is_required' => true],
                ],
                'pauper' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 60, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => 15, 'is_required' => false],
                ],
                'draft' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 40, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => null, 'is_required' => false],
                ],
                'sealed' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 40, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => null, 'is_required' => false],
                ],
            ],

            // One Piece Card Game
            'onepiece' => [
                'standard' => [
                    ['slug' => 'leader', 'name' => 'Leader', 'min_cards' => 1, 'max_cards' => 1, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 50, 'max_cards' => 50, 'is_required' => true],
                    ['slug' => 'don', 'name' => 'DON!! Deck', 'min_cards' => 10, 'max_cards' => 10, 'is_required' => true],
                ],
                'flagship' => [
                    ['slug' => 'leader', 'name' => 'Leader', 'min_cards' => 1, 'max_cards' => 1, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 50, 'max_cards' => 50, 'is_required' => true],
                    ['slug' => 'don', 'name' => 'DON!! Deck', 'min_cards' => 10, 'max_cards' => 10, 'is_required' => true],
                ],
                'treasure-cup' => [
                    ['slug' => 'leader', 'name' => 'Leader', 'min_cards' => 1, 'max_cards' => 1, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 50, 'max_cards' => 50, 'is_required' => true],
                    ['slug' => 'don', 'name' => 'DON!! Deck', 'min_cards' => 10, 'max_cards' => 10, 'is_required' => true],
                ],
                'sealed' => [
                    ['slug' => 'leader', 'name' => 'Leader', 'min_cards' => 1, 'max_cards' => 1, 'is_required' => true],
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 30, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'don', 'name' => 'DON!! Deck', 'min_cards' => 10, 'max_cards' => 10, 'is_required' => true],
                ],
            ],

            // Riftbound
            'riftbound' => [
                'constructed' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 40, 'max_cards' => null, 'is_required' => true],
                    ['slug' => 'sideboard', 'name' => 'Sideboard', 'min_cards' => 0, 'max_cards' => 15, 'is_required' => false],
                ],
                'draft' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 30, 'max_cards' => null, 'is_required' => true],
                ],
                'sealed' => [
                    ['slug' => 'main', 'name' => 'Main Deck', 'min_cards' => 30, 'max_cards' => null, 'is_required' => true],
                ],
            ],
        ];
    }
}
