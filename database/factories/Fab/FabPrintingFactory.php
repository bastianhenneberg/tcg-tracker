<?php

namespace Database\Factories\Fab;

use App\Models\Fab\FabCard;
use App\Models\Fab\FabPrinting;
use App\Models\Fab\FabSet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Fab\FabPrinting>
 */
class FabPrintingFactory extends Factory
{
    protected $model = FabPrinting::class;

    public function definition(): array
    {
        return [
            'fab_card_id' => FabCard::factory(),
            'fab_set_id' => FabSet::factory(),
            'external_id' => $this->faker->unique()->uuid(),
            'collector_number' => strtoupper($this->faker->lexify('???')) . $this->faker->numberBetween(1, 300),
            'rarity' => $this->faker->randomElement(array_keys(FabPrinting::RARITIES)),
            'foiling' => $this->faker->randomElement(array_keys(FabPrinting::FOILINGS)),
            'language' => 'EN',
            'edition' => $this->faker->randomElement(array_keys(FabPrinting::EDITIONS)),
            'image_url' => $this->faker->optional()->imageUrl(),
            'artists' => [$this->faker->name()],
        ];
    }

    public function forCard(FabCard $card): static
    {
        return $this->state(fn (array $attributes) => [
            'fab_card_id' => $card->id,
        ]);
    }

    public function forSet(FabSet $set): static
    {
        return $this->state(fn (array $attributes) => [
            'fab_set_id' => $set->id,
        ]);
    }
}
