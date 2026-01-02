<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\GameAttribute;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\GameAttribute>
 */
class GameAttributeFactory extends Factory
{
    protected $model = GameAttribute::class;

    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'type' => $this->faker->randomElement(['rarity', 'foiling', 'language', 'edition', 'condition']),
            'key' => $this->faker->unique()->lexify('???'),
            'label' => $this->faker->word(),
            'sort_order' => $this->faker->numberBetween(0, 10),
        ];
    }

    public function rarity(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'rarity',
        ]);
    }

    public function foiling(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'foiling',
        ]);
    }

    public function condition(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'condition',
        ]);
    }
}
