<?php

use App\Models\Binder;
use App\Models\BinderPage;
use App\Models\UnifiedCard;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->binder = Binder::factory()->create(['user_id' => $this->user->id]);
    $this->page = BinderPage::factory()->create([
        'user_id' => $this->user->id,
        'binder_id' => $this->binder->id,
    ]);
});

/**
 * A collection card (in_collection) with a given name and collector number.
 */
function collectionCard(int $userId, string $name, string $number): UnifiedInventory
{
    $card = UnifiedCard::factory()->forGame('fab')->create(['name' => $name]);
    $printing = UnifiedPrinting::factory()->forCard($card)->create(['collector_number' => $number]);

    return UnifiedInventory::factory()->create([
        'user_id' => $userId,
        'printing_id' => $printing->id,
        'in_collection' => true,
        'binder_page_id' => null,
    ]);
}

it('finds available cards by collector number', function () {
    collectionCard($this->user->id, 'Some Card', 'OMN123');
    collectionCard($this->user->id, 'Other Card', 'OMN999');

    $this->actingAs($this->user)
        ->getJson("/binder-pages/{$this->page->id}/available-cards?search=OMN123")
        ->assertOk()
        ->assertJsonPath('cards.total', 1);
});

it('finds available cards by name', function () {
    collectionCard($this->user->id, 'Cosmic Duality', 'OMN050');

    $this->actingAs($this->user)
        ->getJson("/binder-pages/{$this->page->id}/available-cards?search=Cosmic")
        ->assertOk()
        ->assertJsonPath('cards.total', 1);
});

it('does not return cards that are not in the collection (still in a lot)', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Lot Card']);
    $printing = UnifiedPrinting::factory()->forCard($card)->create(['collector_number' => 'OMN200']);
    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => false,
        'binder_page_id' => null,
    ]);

    $this->actingAs($this->user)
        ->getJson("/binder-pages/{$this->page->id}/available-cards?search=OMN200")
        ->assertOk()
        ->assertJsonPath('cards.total', 0);
});
