<?php

namespace Database\Factories\Mtg;

use App\Models\Mtg\MtgSet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Mtg\MtgSet>
 */
class MtgSetFactory extends Factory
{
    protected $model = MtgSet::class;

    public function definition(): array
    {
        return [
            'code' => strtoupper($this->faker->unique()->lexify('???')),
            'name' => $this->faker->words(3, true),
            'type' => $this->faker->randomElement(['expansion', 'core', 'masters', 'commander']),
            'release_date' => $this->faker->date(),
            'base_set_size' => $this->faker->numberBetween(100, 400),
            'total_set_size' => $this->faker->numberBetween(150, 500),
            'is_foil_only' => false,
            'is_online_only' => false,
        ];
    }

    public function commander(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'commander',
        ]);
    }

    public function expansion(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'expansion',
        ]);
    }
}
