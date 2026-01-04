<?php

namespace Database\Factories;

use App\Models\UnifiedInventory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UnifiedInventory>
 */
class UnifiedInventoryFactory extends Factory
{
    protected $model = UnifiedInventory::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'printing_id' => null, // Must be set when creating
            'lot_id' => null,
            'box_id' => null,
            'quantity' => 1,
            'condition' => $this->faker->randomElement(['NM', 'LP', 'MP', 'HP', 'DMG']),
            'language' => 'EN',
            'notes' => null,
            'purchase_price' => null,
            'purchase_currency' => null,
            'purchased_at' => null,
            'in_collection' => false,
            'extra' => [],
        ];
    }

    public function inCollection(): static
    {
        return $this->state(fn (array $attributes) => [
            'in_collection' => true,
        ]);
    }

    public function inInventory(): static
    {
        return $this->state(fn (array $attributes) => [
            'in_collection' => false,
        ]);
    }

    public function withPosition(int $position): static
    {
        return $this->state(fn (array $attributes) => [
            'extra' => array_merge($attributes['extra'] ?? [], ['position_in_lot' => $position]),
        ]);
    }
}
