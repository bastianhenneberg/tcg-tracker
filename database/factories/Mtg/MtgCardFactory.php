<?php

namespace Database\Factories\Mtg;

use App\Models\Mtg\MtgCard;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Mtg\MtgCard>
 */
class MtgCardFactory extends Factory
{
    protected $model = MtgCard::class;

    public function definition(): array
    {
        $colors = $this->faker->randomElements(['W', 'U', 'B', 'R', 'G'], $this->faker->numberBetween(0, 2));

        return [
            'oracle_id' => $this->faker->unique()->uuid(),
            'name' => $this->faker->words(rand(2, 4), true),
            'mana_cost' => $this->generateManaCost($colors),
            'mana_value' => $this->faker->numberBetween(1, 7),
            'type_line' => $this->faker->randomElement(['Creature — Human Wizard', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker']),
            'oracle_text' => $this->faker->optional()->sentence(),
            'power' => $this->faker->optional(0.5)->numberBetween(1, 7) ? (string) $this->faker->numberBetween(1, 7) : null,
            'toughness' => $this->faker->optional(0.5)->numberBetween(1, 7) ? (string) $this->faker->numberBetween(1, 7) : null,
            'colors' => $colors,
            'color_identity' => $colors,
            'types' => [$this->faker->randomElement(['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Land', 'Planeswalker'])],
            'subtypes' => [],
            'supertypes' => [],
            'keywords' => [],
            'layout' => 'normal',
            'legalities' => [
                'standard' => $this->faker->randomElement(['Legal', 'Not Legal']),
                'modern' => 'Legal',
                'legacy' => 'Legal',
                'vintage' => 'Legal',
                'commander' => 'Legal',
            ],
        ];
    }

    private function generateManaCost(array $colors): string
    {
        $cost = '';
        $generic = $this->faker->numberBetween(0, 4);
        if ($generic > 0) {
            $cost .= '{'.$generic.'}';
        }
        foreach ($colors as $color) {
            $cost .= '{'.$color.'}';
        }

        return $cost ?: '{0}';
    }

    public function creature(): static
    {
        return $this->state(fn (array $attributes) => [
            'types' => ['Creature'],
            'type_line' => 'Creature — Human Warrior',
            'power' => (string) $this->faker->numberBetween(1, 5),
            'toughness' => (string) $this->faker->numberBetween(1, 5),
        ]);
    }

    public function instant(): static
    {
        return $this->state(fn (array $attributes) => [
            'types' => ['Instant'],
            'type_line' => 'Instant',
            'power' => null,
            'toughness' => null,
        ]);
    }

    public function colorless(): static
    {
        return $this->state(fn (array $attributes) => [
            'colors' => [],
            'color_identity' => [],
            'mana_cost' => '{'.$this->faker->numberBetween(1, 6).'}',
        ]);
    }
}
