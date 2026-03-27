<?php

namespace Database\Factories;

use App\Models\Binder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\BinderPage>
 */
class BinderPageFactory extends Factory
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
            'binder_id' => Binder::factory(),
            'page_number' => fake()->numberBetween(1, 100),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
