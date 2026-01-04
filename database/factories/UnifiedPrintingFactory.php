<?php

namespace Database\Factories;

use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UnifiedPrinting>
 */
class UnifiedPrintingFactory extends Factory
{
    protected $model = UnifiedPrinting::class;

    public function definition(): array
    {
        return [
            'card_id' => UnifiedCard::factory(),
            'set_id' => null,
            'set_code' => strtoupper($this->faker->lexify('???')),
            'set_name' => $this->faker->words(2, true),
            'collector_number' => strtoupper($this->faker->lexify('???')).$this->faker->numberBetween(1, 300),
            'rarity' => $this->faker->randomElement(['C', 'R', 'S', 'M', 'L']),
            'rarity_label' => $this->faker->randomElement(['Common', 'Rare', 'Super Rare', 'Majestic', 'Legendary']),
            'finish' => $this->faker->randomElement(['S', 'R', 'C', 'G']),
            'finish_label' => $this->faker->randomElement(['Standard', 'Rainbow Foil', 'Cold Foil', 'Gold Cold Foil']),
            'language' => 'EN',
            'flavor_text' => $this->faker->optional()->sentence(),
            'artist' => $this->faker->name(),
            'image_url' => $this->faker->optional()->imageUrl(),
            'image_url_small' => null,
            'image_url_back' => null,
            'is_promo' => false,
            'is_reprint' => false,
            'is_variant' => false,
            'released_at' => null,
            'prices' => [],
            'game_specific' => [],
            'external_ids' => [],
        ];
    }

    public function forCard(UnifiedCard $card): static
    {
        return $this->state(fn (array $attributes) => [
            'card_id' => $card->id,
        ]);
    }
}
