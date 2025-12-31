<?php

namespace Database\Factories\Fab;

use App\Models\Fab\FabCollection;
use App\Models\Fab\FabPrinting;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Fab\FabCollection>
 */
class FabCollectionFactory extends Factory
{
    protected $model = FabCollection::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'fab_printing_id' => FabPrinting::factory(),
            'condition' => $this->faker->randomElement(array_keys(FabCollection::CONDITIONS)),
            'quantity' => 1,
            'notes' => null,
            'source_lot_id' => null,
        ];
    }

    public function forUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
        ]);
    }

    public function withQuantity(int $quantity): static
    {
        return $this->state(fn (array $attributes) => [
            'quantity' => $quantity,
        ]);
    }
}
