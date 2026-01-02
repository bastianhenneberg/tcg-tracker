<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Game>
 */
class GameFactory extends Factory
{
    protected $model = Game::class;

    public function definition(): array
    {
        $name = $this->faker->words(rand(2, 4), true);

        return [
            'slug' => Str::slug($name),
            'name' => $name,
            'description' => $this->faker->optional()->sentence(),
            'logo_url' => null,
            'is_official' => false,
            'user_id' => User::factory(),
        ];
    }

    public function official(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_official' => true,
            'user_id' => null,
        ]);
    }

    public function custom(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_official' => false,
        ]);
    }
}
