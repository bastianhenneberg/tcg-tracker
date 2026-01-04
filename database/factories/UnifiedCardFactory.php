<?php

namespace Database\Factories;

use App\Models\UnifiedCard;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UnifiedCard>
 */
class UnifiedCardFactory extends Factory
{
    protected $model = UnifiedCard::class;

    public function definition(): array
    {
        return [
            'game' => 'fab',
            'name' => $this->faker->words(rand(2, 4), true),
            'type_line' => $this->faker->randomElement(['Action', 'Attack Action', 'Defense Reaction', 'Instant', 'Equipment', 'Weapon', 'Hero']),
            'types' => [$this->faker->randomElement(['Action', 'Attack', 'Defense', 'Instant'])],
            'subtypes' => [],
            'supertypes' => [],
            'text' => $this->faker->optional()->sentence(),
            'cost' => $this->faker->optional(0.7)->numberBetween(0, 6),
            'power' => $this->faker->optional(0.5)->numberBetween(1, 10),
            'defense' => $this->faker->optional(0.5)->numberBetween(1, 5),
            'health' => null,
            'colors' => [],
            'keywords' => [],
            'legalities' => [],
            'game_specific' => [],
            'external_ids' => [],
        ];
    }

    public function forGame(string $game): static
    {
        return $this->state(fn (array $attributes) => [
            'game' => $game,
        ]);
    }
}
