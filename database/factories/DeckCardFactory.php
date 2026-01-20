<?php

namespace Database\Factories;

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckZone;
use App\Models\UnifiedPrinting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DeckCard>
 */
class DeckCardFactory extends Factory
{
    protected $model = DeckCard::class;

    public function definition(): array
    {
        return [
            'deck_id' => Deck::factory(),
            'deck_zone_id' => DeckZone::factory(),
            'printing_id' => UnifiedPrinting::factory(),
            'quantity' => $this->faker->numberBetween(1, 4),
            'position' => $this->faker->numberBetween(0, 100),
        ];
    }

    public function forDeck(Deck $deck): static
    {
        return $this->state(fn (array $attributes) => [
            'deck_id' => $deck->id,
        ]);
    }

    public function forZone(DeckZone $zone): static
    {
        return $this->state(fn (array $attributes) => [
            'deck_zone_id' => $zone->id,
        ]);
    }

    public function forPrinting(UnifiedPrinting $printing): static
    {
        return $this->state(fn (array $attributes) => [
            'printing_id' => $printing->id,
        ]);
    }
}
