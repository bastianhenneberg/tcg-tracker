<?php

use App\Models\Game;
use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use App\Models\UnifiedSet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

/**
 * Create a printing in the given set with a specific collector number.
 */
function printingInSet(int $setId, string $number, array $overrides = []): UnifiedPrinting
{
    $card = UnifiedCard::factory()->forGame('fab')->create();

    return UnifiedPrinting::factory()->forCard($card)->create(array_merge([
        'set_id' => $setId,
        'collector_number' => $number,
    ], $overrides));
}

beforeEach(function () {
    $this->withoutVite();
    $this->user = User::factory()->create();
    $this->game = Game::factory()->official()->create([
        'slug' => 'fab',
        'name' => 'Flesh and Blood',
    ]);
    $this->set = UnifiedSet::create([
        'game' => 'fab',
        'code' => 'OMN',
        'name' => 'Omens of the Third Age',
    ]);
});

it('requires authentication', function () {
    $this->get("/g/fab/sets/{$this->set->id}/print")
        ->assertRedirect('/login');
});

it('renders the print page and chunks cards into binder pages of 9', function () {
    // 10 cards → 2 pages (9 + 1). Created out of order to prove sorting.
    foreach ([3, 10, 1, 7, 5, 2, 9, 4, 8, 6] as $number) {
        printingInSet($this->set->id, (string) $number);
    }

    $this->actingAs($this->user)
        ->get("/g/fab/sets/{$this->set->id}/print")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('sets/print')
            ->where('cardCount', 10)
            ->where('slotsPerPage', 9)
            ->has('pages', 2)
            ->has('pages.0', 9)
            ->has('pages.1', 1)
            // natural sort: 2 must come before 10 (lexical would put "10" second)
            ->where('pages.0.0.collector_number', '1')
            ->where('pages.0.1.collector_number', '2')
            ->where('pages.1.0.collector_number', '10')
        );
});

it('collapses printing variants that share a collector number into one pocket', function () {
    // Same collector number, three finishes → a single pocket.
    printingInSet($this->set->id, '1', ['finish' => 'S', 'finish_label' => 'Standard']);
    printingInSet($this->set->id, '1', ['finish' => 'R', 'finish_label' => 'Rainbow Foil']);
    printingInSet($this->set->id, '1', ['finish' => 'C', 'finish_label' => 'Cold Foil']);

    $this->actingAs($this->user)
        ->get("/g/fab/sets/{$this->set->id}/print")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('cardCount', 1)
            ->has('pages.0', 1)
        );
});

it('prefers the base card over a variant for a shared pocket', function () {
    $variant = printingInSet($this->set->id, '5', ['is_variant' => true]);
    $base = printingInSet($this->set->id, '5', ['is_variant' => false]);

    $this->actingAs($this->user)
        ->get("/g/fab/sets/{$this->set->id}/print")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('cardCount', 1)
            ->where('pages.0.0.id', $base->id)
        );
});

it('returns 404 when the set belongs to a different game', function () {
    Game::factory()->official()->create([
        'slug' => 'riftbound',
        'name' => 'Riftbound',
    ]);

    // The FAB set does not exist under the riftbound game.
    $this->actingAs($this->user)
        ->get("/g/riftbound/sets/{$this->set->id}/print")
        ->assertNotFound();
});
