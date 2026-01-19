<?php

use App\Models\Binder;
use App\Models\BinderPage;
use App\Models\Game;
use App\Models\UnifiedCard;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->game = Game::factory()->official()->create([
        'slug' => 'fab',
        'name' => 'Flesh and Blood',
    ]);
    $this->binder = Binder::factory()->create(['user_id' => $this->user->id]);
    $this->binderPage = BinderPage::factory()->create([
        'user_id' => $this->user->id,
        'binder_id' => $this->binder->id,
    ]);
});

it('requires authentication', function () {
    $this->post("/binder-pages/{$this->binderPage->id}/assign")
        ->assertRedirect('/login');
});

it('assigns a single card to a slot', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $inventory = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
        'quantity' => 1,
        'binder_page_id' => null,
    ]);

    $response = $this->actingAs($this->user)
        ->post("/binder-pages/{$this->binderPage->id}/assign", [
            'inventory_id' => $inventory->id,
            'slot' => 1,
        ]);

    $response->assertRedirect();

    $inventory->refresh();
    expect($inventory->binder_page_id)->toBe($this->binderPage->id);
    expect($inventory->binder_slot)->toBe(1);
    expect($inventory->binder_id)->toBe($this->binder->id);
});

it('splits card with quantity > 1 when assigning to binder', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $inventory = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
        'quantity' => 3,
        'binder_page_id' => null,
        'condition' => 'NM',
        'language' => 'en',
    ]);

    $response = $this->actingAs($this->user)
        ->post("/binder-pages/{$this->binderPage->id}/assign", [
            'inventory_id' => $inventory->id,
            'slot' => 1,
        ]);

    $response->assertRedirect();

    // Original should be decremented
    $inventory->refresh();
    expect($inventory->quantity)->toBe(2);
    expect($inventory->binder_page_id)->toBeNull();

    // New item should be created with quantity 1 in the binder
    $binderItem = UnifiedInventory::where('binder_page_id', $this->binderPage->id)
        ->where('binder_slot', 1)
        ->first();

    expect($binderItem)->not->toBeNull();
    expect($binderItem->quantity)->toBe(1);
    expect($binderItem->printing_id)->toBe($printing->id);
    expect($binderItem->condition)->toBe('NM');
    expect($binderItem->language)->toBe('en');
});

it('can assign multiple cards from same source to different slots', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $inventory = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
        'quantity' => 4,
        'binder_page_id' => null,
    ]);

    // Assign first copy to slot 1
    $this->actingAs($this->user)
        ->post("/binder-pages/{$this->binderPage->id}/assign", [
            'inventory_id' => $inventory->id,
            'slot' => 1,
        ]);

    $inventory->refresh();
    expect($inventory->quantity)->toBe(3);

    // Assign second copy to slot 2
    $this->actingAs($this->user)
        ->post("/binder-pages/{$this->binderPage->id}/assign", [
            'inventory_id' => $inventory->id,
            'slot' => 2,
        ]);

    $inventory->refresh();
    expect($inventory->quantity)->toBe(2);

    // Both slots should have cards
    $slot1Card = UnifiedInventory::where('binder_page_id', $this->binderPage->id)
        ->where('binder_slot', 1)
        ->first();
    $slot2Card = UnifiedInventory::where('binder_page_id', $this->binderPage->id)
        ->where('binder_slot', 2)
        ->first();

    expect($slot1Card)->not->toBeNull();
    expect($slot2Card)->not->toBeNull();
});

it('prevents assigning more than 4 cards to a slot', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    // Fill slot 1 with 4 cards
    for ($i = 0; $i < 4; $i++) {
        UnifiedInventory::factory()->create([
            'user_id' => $this->user->id,
            'printing_id' => $printing->id,
            'in_collection' => true,
            'quantity' => 1,
            'binder_page_id' => $this->binderPage->id,
            'binder_slot' => 1,
            'binder_id' => $this->binder->id,
        ]);
    }

    // Try to add a 5th card
    $newInventory = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
        'quantity' => 1,
        'binder_page_id' => null,
    ]);

    $response = $this->actingAs($this->user)
        ->post("/binder-pages/{$this->binderPage->id}/assign", [
            'inventory_id' => $newInventory->id,
            'slot' => 1,
        ]);

    $response->assertSessionHasErrors('slot');

    // Card should not be assigned
    $newInventory->refresh();
    expect($newInventory->binder_page_id)->toBeNull();
});

it('prevents assigning other users cards', function () {
    $otherUser = User::factory()->create();
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $otherInventory = UnifiedInventory::factory()->create([
        'user_id' => $otherUser->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
        'quantity' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->post("/binder-pages/{$this->binderPage->id}/assign", [
            'inventory_id' => $otherInventory->id,
            'slot' => 1,
        ]);

    // findOrFail throws 404 when card doesn't belong to user
    $response->assertNotFound();

    // Verify card was not assigned
    $otherInventory->refresh();
    expect($otherInventory->binder_page_id)->toBeNull();
});

it('only assigns collection items not inventory items', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $inventoryItem = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => false, // This is an inventory item, not collection
        'quantity' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->post("/binder-pages/{$this->binderPage->id}/assign", [
            'inventory_id' => $inventoryItem->id,
            'slot' => 1,
        ]);

    $response->assertNotFound();
});

it('removes a card from a slot', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $inventory = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
        'quantity' => 1,
        'binder_page_id' => $this->binderPage->id,
        'binder_slot' => 1,
        'binder_id' => $this->binder->id,
    ]);

    $response = $this->actingAs($this->user)
        ->post("/binder-pages/{$this->binderPage->id}/remove", [
            'inventory_id' => $inventory->id,
        ]);

    $response->assertRedirect();

    $inventory->refresh();
    expect($inventory->binder_page_id)->toBeNull();
    expect($inventory->binder_slot)->toBeNull();
    expect($inventory->binder_id)->toBeNull();
});

it('prevents unauthorized access to binder page', function () {
    $otherUser = User::factory()->create();
    $otherBinder = Binder::factory()->create(['user_id' => $otherUser->id]);
    $otherPage = BinderPage::factory()->create(['binder_id' => $otherBinder->id]);

    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $inventory = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
        'quantity' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->post("/binder-pages/{$otherPage->id}/assign", [
            'inventory_id' => $inventory->id,
            'slot' => 1,
        ]);

    $response->assertForbidden();
});
