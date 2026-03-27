<?php

namespace Database\Factories;

use App\Models\DeckZone;
use App\Models\GameFormat;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DeckZone>
 */
class DeckZoneFactory extends Factory
{
    protected $model = DeckZone::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->randomElement(['Main', 'Sideboard', 'Heroes', 'Equipment', 'Weapons', 'Extra', 'Reserve', 'Tokens']);

        return [
            'game_format_id' => GameFormat::factory(),
            'slug' => Str::slug($name).'-'.$this->faker->unique()->randomNumber(5),
            'name' => $name,
            'min_cards' => $this->faker->numberBetween(0, 1),
            'max_cards' => $this->faker->randomElement([null, 52, 60, 80]),
            'is_required' => $this->faker->boolean(50),
            'counts_towards_deck' => true,
            'sort_order' => $this->faker->numberBetween(0, 10),
        ];
    }

    public function forFormat(GameFormat $format): static
    {
        return $this->state(fn (array $attributes) => [
            'game_format_id' => $format->id,
        ]);
    }

    public function main(): static
    {
        return $this->state(fn (array $attributes) => [
            'slug' => 'main',
            'name' => 'Main',
            'min_cards' => 52,
            'max_cards' => 80,
            'is_required' => true,
        ]);
    }

    public function sideboard(): static
    {
        return $this->state(fn (array $attributes) => [
            'slug' => 'sideboard',
            'name' => 'Sideboard',
            'min_cards' => 0,
            'max_cards' => 11,
            'is_required' => false,
        ]);
    }
}
