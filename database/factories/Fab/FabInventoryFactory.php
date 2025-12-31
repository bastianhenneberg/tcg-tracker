<?php

namespace Database\Factories\Fab;

use App\Models\Fab\FabInventory;
use App\Models\Fab\FabPrinting;
use App\Models\Lot;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Fab\FabInventory>
 */
class FabInventoryFactory extends Factory
{
    protected $model = FabInventory::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'lot_id' => Lot::factory(),
            'fab_printing_id' => FabPrinting::factory(),
            'condition' => $this->faker->randomElement(array_keys(FabInventory::CONDITIONS)),
            'price' => $this->faker->optional(0.5)->randomFloat(2, 0.5, 100),
            'position_in_lot' => $this->faker->numberBetween(1, 100),
            'sold_at' => null,
            'sold_price' => null,
        ];
    }

    public function sold(): static
    {
        return $this->state(fn (array $attributes) => [
            'sold_at' => now(),
            'sold_price' => $attributes['price'] ?? $this->faker->randomFloat(2, 0.5, 100),
        ]);
    }

    public function forUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
        ]);
    }

    public function forLot(Lot $lot): static
    {
        return $this->state(fn (array $attributes) => [
            'lot_id' => $lot->id,
            'user_id' => $lot->user_id,
        ]);
    }
}
