<?php

namespace Database\Factories;

use App\Models\Deck;
use App\Models\GameFormat;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Deck>
 */
class DeckFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'game_format_id' => GameFormat::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'is_public' => fake()->boolean(20),
            // Default to false so deck factories are deterministic; use the
            // collectionOnly() state when a collection-restricted deck is needed.
            'use_collection_only' => false,
            'metadata' => null,
        ];
    }

    public function public(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_public' => true,
        ]);
    }

    public function collectionOnly(): static
    {
        return $this->state(fn (array $attributes) => [
            'use_collection_only' => true,
        ]);
    }
}
