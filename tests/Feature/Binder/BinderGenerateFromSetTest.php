<?php

use App\Models\Binder;
use App\Models\BinderPageSlot;
use App\Models\Game;
use App\Models\GameAttribute;
use App\Models\UnifiedCard;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\UnifiedSet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

/**
 * Create a printing of a fresh card in the set with a specific collector number.
 */
function omenPrinting(int $setId, string $number, array $overrides = []): UnifiedPrinting
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
    foreach (['C' => 0, 'R' => 1, 'S' => 2, 'M' => 3, 'L' => 4] as $key => $order) {
        GameAttribute::create([
            'game_id' => $this->game->id,
            'type' => GameAttribute::TYPE_RARITY,
            'key' => $key,
            'label' => $key,
            'sort_order' => $order,
        ]);
    }

    $this->set = UnifiedSet::create([
        'game' => 'fab',
        'code' => 'OMN',
        'name' => 'Omens of the Third Age',
    ]);

    $this->binder = Binder::factory()->create(['user_id' => $this->user->id]);
});

it('requires authentication', function () {
    $this->post("/binders/{$this->binder->id}/generate-from-set", [
        'unified_set_id' => $this->set->id,
    ])->assertRedirect('/login');
});

it('generates template pages for the whole set, chunked into 9-pocket pages', function () {
    for ($n = 1; $n <= 10; $n++) {
        omenPrinting($this->set->id, (string) $n);
    }

    $this->actingAs($this->user)
        ->post("/binders/{$this->binder->id}/generate-from-set", [
            'unified_set_id' => $this->set->id,
            'sort' => 'number',
        ])
        ->assertRedirect();

    $this->binder->refresh();
    expect($this->binder->unified_set_id)->toBe($this->set->id);
    expect($this->binder->pages()->count())->toBe(2); // 10 cards -> 9 + 1
    expect(BinderPageSlot::count())->toBe(10);

    // First page, first slot is collector number 1 (natural order).
    $firstPage = $this->binder->pages()->orderBy('page_number')->first();
    $firstSlot = $firstPage->templateSlots()->orderBy('slot')->first();
    expect($firstSlot->printing->collector_number)->toBe('1');
});

it('collapses printing variants sharing a collector number into one pocket', function () {
    omenPrinting($this->set->id, '1', ['finish' => 'S']);
    omenPrinting($this->set->id, '1', ['finish' => 'R']);
    omenPrinting($this->set->id, '5', ['finish' => 'S']);

    $this->actingAs($this->user)
        ->post("/binders/{$this->binder->id}/generate-from-set", [
            'unified_set_id' => $this->set->id,
        ])
        ->assertRedirect();

    expect(BinderPageSlot::count())->toBe(2); // numbers 1 and 5
});

it('orders pockets by rarity ascending and descending', function () {
    omenPrinting($this->set->id, '1', ['rarity' => 'L']); // legendary
    omenPrinting($this->set->id, '2', ['rarity' => 'C']); // common
    omenPrinting($this->set->id, '3', ['rarity' => 'S']); // super rare

    // Ascending: common (C=0) first
    $this->actingAs($this->user)->post("/binders/{$this->binder->id}/generate-from-set", [
        'unified_set_id' => $this->set->id,
        'sort' => 'rarity_asc',
    ]);
    $ascFirst = $this->binder->pages()->orderBy('page_number')->first()
        ->templateSlots()->orderBy('slot')->with('printing')->get();
    expect($ascFirst->first()->printing->rarity)->toBe('C');
    expect($ascFirst->last()->printing->rarity)->toBe('L');

    // Descending: legendary (L=4) first
    $this->actingAs($this->user)->post("/binders/{$this->binder->id}/generate-from-set", [
        'unified_set_id' => $this->set->id,
        'sort' => 'rarity_desc',
    ]);
    $descFirst = $this->binder->fresh()->pages()->orderBy('page_number')->first()
        ->templateSlots()->orderBy('slot')->with('printing')->get();
    expect($descFirst->first()->printing->rarity)->toBe('L');
    expect($descFirst->last()->printing->rarity)->toBe('C');
});

it('replaces existing template pages when regenerating', function () {
    for ($n = 1; $n <= 3; $n++) {
        omenPrinting($this->set->id, (string) $n);
    }

    $this->actingAs($this->user)->post("/binders/{$this->binder->id}/generate-from-set", [
        'unified_set_id' => $this->set->id,
    ]);
    expect($this->binder->pages()->count())->toBe(1);

    // Regenerate -> still exactly one page, not two.
    $this->actingAs($this->user)->post("/binders/{$this->binder->id}/generate-from-set", [
        'unified_set_id' => $this->set->id,
    ]);
    expect($this->binder->fresh()->pages()->count())->toBe(1);
    expect(BinderPageSlot::count())->toBe(3);
});

it('marks owned cards in the template overlay on the binder show page', function () {
    $ownedPrinting = omenPrinting($this->set->id, '1');
    $missingPrinting = omenPrinting($this->set->id, '2');

    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $ownedPrinting->id,
        'in_collection' => true,
        'quantity' => 2,
    ]);

    $this->actingAs($this->user)->post("/binders/{$this->binder->id}/generate-from-set", [
        'unified_set_id' => $this->set->id,
    ]);

    $this->actingAs($this->user)
        ->get("/binders/{$this->binder->id}?page=1")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('collection/binders/show')
            ->where('templateSlots.1.owned', true)
            ->where('templateSlots.1.quantity', 2)
            ->where('templateSlots.2.owned', false)
        );
});

it('lists sets of a game for the picker', function () {
    $this->actingAs($this->user)
        ->getJson('/binders/available-sets?game=fab')
        ->assertOk()
        ->assertJsonFragment(['code' => 'OMN']);
});

it('forbids generating on another users binder', function () {
    $other = Binder::factory()->create(['user_id' => User::factory()->create()->id]);

    $this->actingAs($this->user)
        ->post("/binders/{$other->id}/generate-from-set", [
            'unified_set_id' => $this->set->id,
        ])
        ->assertForbidden();
});
