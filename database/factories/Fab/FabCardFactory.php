<?php

namespace Database\Factories\Fab;

use App\Models\Fab\FabCard;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Fab\FabCard>
 */
class FabCardFactory extends Factory
{
    protected $model = FabCard::class;

    public function definition(): array
    {
        return [
            'external_id' => $this->faker->unique()->uuid(),
            'name' => $this->faker->words(rand(2, 4), true),
            'pitch' => $this->faker->optional(0.7)->randomElement([1, 2, 3]),
            'cost' => $this->faker->optional(0.7)->numberBetween(0, 6),
            'power' => $this->faker->optional(0.5)->numberBetween(1, 10),
            'defense' => $this->faker->optional(0.5)->numberBetween(1, 5),
            'health' => null,
            'intelligence' => null,
            'types' => [$this->faker->randomElement(['Action', 'Attack Action', 'Defense Reaction', 'Instant', 'Equipment', 'Weapon', 'Hero'])],
            'traits' => [],
            'card_keywords' => [],
            'functional_text' => $this->faker->optional()->sentence(),
            'type_text' => $this->faker->optional()->words(3, true),
            'blitz_legal' => $this->faker->boolean(80),
            'cc_legal' => $this->faker->boolean(80),
            'commoner_legal' => $this->faker->boolean(60),
            'll_legal' => $this->faker->boolean(70),
        ];
    }

    public function hero(): static
    {
        return $this->state(fn (array $attributes) => [
            'types' => ['Hero'],
            'health' => $this->faker->numberBetween(20, 40),
            'intelligence' => $this->faker->numberBetween(1, 4),
            'pitch' => null,
            'cost' => null,
            'power' => null,
            'defense' => null,
        ]);
    }
}
