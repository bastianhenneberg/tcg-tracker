<?php

namespace Database\Factories\Fab;

use App\Models\Fab\FabSet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Fab\FabSet>
 */
class FabSetFactory extends Factory
{
    protected $model = FabSet::class;

    public function definition(): array
    {
        return [
            'external_id' => strtoupper($this->faker->unique()->lexify('???')),
            'name' => $this->faker->words(3, true),
            'released_at' => $this->faker->date(),
        ];
    }
}
