<?php

use App\Models\Game;
use App\Models\Lot;
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
    $this->lot = Lot::factory()->forUser($this->user)->create();
});

it('requires authentication', function () {
    $this->post('/g/fab/collection/move-to-inventory')
        ->assertRedirect('/login');
});

it('moves collection items to inventory', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $collectionItem = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
        'lot_id' => null,
        'quantity' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/collection/move-to-inventory', [
            'ids' => [$collectionItem->id],
            'lot_id' => $this->lot->id,
        ]);

    $response->assertRedirect();

    // Verify item was moved (in_collection=false, lot assigned)
    $collectionItem->refresh();
    expect($collectionItem->in_collection)->toBeFalse();
    expect($collectionItem->lot_id)->toBe($this->lot->id);
    expect($collectionItem->position_in_lot)->toBe(1);
});

it('splits quantity when moving item with quantity > 1', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $collectionItem = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
        'lot_id' => null,
        'quantity' => 3,
        'condition' => 'NM',
        'language' => 'EN',
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/collection/move-to-inventory', [
            'ids' => [$collectionItem->id],
            'lot_id' => $this->lot->id,
        ]);

    $response->assertRedirect();

    // Original item should have quantity decremented and still be in collection
    $collectionItem->refresh();
    expect($collectionItem->quantity)->toBe(2);
    expect($collectionItem->in_collection)->toBeTrue();
    expect($collectionItem->lot_id)->toBeNull();

    // New item should be created in inventory
    $inventoryItem = UnifiedInventory::where('user_id', $this->user->id)
        ->where('in_collection', false)
        ->where('lot_id', $this->lot->id)
        ->first();

    expect($inventoryItem)->not->toBeNull();
    expect($inventoryItem->quantity)->toBe(1);
    expect($inventoryItem->condition)->toBe('NM');
    expect($inventoryItem->language)->toBe('EN');
});

it('prevents moving other users items', function () {
    $otherUser = User::factory()->create();
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $otherItem = UnifiedInventory::factory()->create([
        'user_id' => $otherUser->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/collection/move-to-inventory', [
            'ids' => [$otherItem->id],
            'lot_id' => $this->lot->id,
        ]);

    $response->assertRedirect();

    // Other user's item should not be modified
    $otherItem->refresh();
    expect($otherItem->in_collection)->toBeTrue();
    expect($otherItem->lot_id)->toBeNull();
});

it('only moves items that are in collection', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $inventoryItem = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => false,
        'lot_id' => null,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/collection/move-to-inventory', [
            'ids' => [$inventoryItem->id],
            'lot_id' => $this->lot->id,
        ]);

    $response->assertRedirect();

    // Item should not be moved since it wasn't in collection
    $inventoryItem->refresh();
    expect($inventoryItem->lot_id)->toBeNull();
});

it('validates lot_id is required', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $collectionItem = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/collection/move-to-inventory', [
            'ids' => [$collectionItem->id],
        ]);

    $response->assertSessionHasErrors('lot_id');
});

it('validates ids are required', function () {
    $response = $this->actingAs($this->user)
        ->post('/g/fab/collection/move-to-inventory', [
            'lot_id' => $this->lot->id,
        ]);

    $response->assertSessionHasErrors('ids');
});
