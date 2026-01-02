<?php

namespace Database\Factories\Mtg;

use App\Models\Mtg\MtgCard;
use App\Models\Mtg\MtgPrinting;
use App\Models\Mtg\MtgSet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Mtg\MtgPrinting>
 */
class MtgPrintingFactory extends Factory
{
    protected $model = MtgPrinting::class;

    public function definition(): array
    {
        $scryfallId = $this->faker->uuid();

        return [
            'mtg_card_id' => MtgCard::factory(),
            'mtg_set_id' => MtgSet::factory(),
            'uuid' => $this->faker->unique()->uuid(),
            'scryfall_id' => $scryfallId,
            'number' => (string) $this->faker->numberBetween(1, 300),
            'rarity' => $this->faker->randomElement(['common', 'uncommon', 'rare', 'mythic']),
            'artist' => $this->faker->name(),
            'flavor_text' => $this->faker->optional()->sentence(),
            'border_color' => 'black',
            'frame_version' => '2015',
            'has_foil' => $this->faker->boolean(70),
            'has_non_foil' => true,
            'is_promo' => false,
            'is_full_art' => false,
            'is_textless' => false,
            'is_oversized' => false,
            'image_url' => $this->buildImageUrl($scryfallId),
        ];
    }

    private function buildImageUrl(string $scryfallId): string
    {
        $a = substr($scryfallId, 0, 1);
        $b = substr($scryfallId, 1, 1);

        return "https://cards.scryfall.io/normal/front/{$a}/{$b}/{$scryfallId}.jpg";
    }

    public function rare(): static
    {
        return $this->state(fn (array $attributes) => [
            'rarity' => 'rare',
        ]);
    }

    public function mythic(): static
    {
        return $this->state(fn (array $attributes) => [
            'rarity' => 'mythic',
        ]);
    }

    public function foilOnly(): static
    {
        return $this->state(fn (array $attributes) => [
            'has_foil' => true,
            'has_non_foil' => false,
        ]);
    }

    public function promo(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_promo' => true,
        ]);
    }
}
