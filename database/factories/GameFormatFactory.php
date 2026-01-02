<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\GameFormat;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\GameFormat>
 */
class GameFormatFactory extends Factory
{
    protected $model = GameFormat::class;

    public function definition(): array
    {
        $name = $this->faker->words(2, true);

        return [
            'game_id' => Game::factory(),
            'slug' => Str::slug($name),
            'name' => $name,
            'description' => $this->faker->optional()->sentence(),
            'is_active' => true,
            'sort_order' => $this->faker->numberBetween(0, 10),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
