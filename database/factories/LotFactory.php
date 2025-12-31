<?php

namespace Database\Factories;

use App\Models\Box;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Lot>
 */
class LotFactory extends Factory
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
            'box_id' => Box::factory(),
            'lot_number' => fake()->unique()->numberBetween(1, 9999),
            'card_range_start' => fake()->numberBetween(1, 100),
            'card_range_end' => fake()->numberBetween(101, 200),
            'scanned_at' => fake()->optional()->dateTimeBetween('-1 year', 'now'),
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function forUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
            'box_id' => Box::factory()->for($user),
        ]);
    }
}
