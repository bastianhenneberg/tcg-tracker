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
    $this->sourceLot = Lot::factory()->forUser($this->user)->create();
    $this->targetLot = Lot::factory()->forUser($this->user)->create();
});

it('requires authentication', function () {
    $this->post('/g/fab/inventory/change-lot')
        ->assertRedirect('/login');
});

it('moves inventory items to a different lot', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $item = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'lot_id' => $this->sourceLot->id,
        'in_collection' => false,
        'position_in_lot' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/inventory/change-lot', [
            'ids' => [$item->id],
            'lot_id' => $this->targetLot->id,
        ]);

    $response->assertRedirect();

    $item->refresh();
    expect($item->lot_id)->toBe($this->targetLot->id);
    expect($item->position_in_lot)->toBe(1);
});

it('assigns correct position when moving to lot with existing items', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    // Create existing item in target lot
    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'lot_id' => $this->targetLot->id,
        'in_collection' => false,
        'position_in_lot' => 5,
    ]);

    // Create item to move
    $itemToMove = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'lot_id' => $this->sourceLot->id,
        'in_collection' => false,
        'position_in_lot' => 1,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/inventory/change-lot', [
            'ids' => [$itemToMove->id],
            'lot_id' => $this->targetLot->id,
        ]);

    $response->assertRedirect();

    $itemToMove->refresh();
    expect($itemToMove->lot_id)->toBe($this->targetLot->id);
    expect($itemToMove->position_in_lot)->toBe(6); // After existing item at position 5
});

it('moves multiple items to target lot', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $item1 = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'lot_id' => $this->sourceLot->id,
        'in_collection' => false,
    ]);

    $item2 = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'lot_id' => $this->sourceLot->id,
        'in_collection' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/inventory/change-lot', [
            'ids' => [$item1->id, $item2->id],
            'lot_id' => $this->targetLot->id,
        ]);

    $response->assertRedirect();

    $item1->refresh();
    $item2->refresh();

    expect($item1->lot_id)->toBe($this->targetLot->id);
    expect($item2->lot_id)->toBe($this->targetLot->id);
});

it('prevents moving other users items', function () {
    $otherUser = User::factory()->create();
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $otherItem = UnifiedInventory::factory()->create([
        'user_id' => $otherUser->id,
        'printing_id' => $printing->id,
        'lot_id' => null,
        'in_collection' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/inventory/change-lot', [
            'ids' => [$otherItem->id],
            'lot_id' => $this->targetLot->id,
        ]);

    $response->assertRedirect();

    // Other user's item should not be moved
    $otherItem->refresh();
    expect($otherItem->lot_id)->toBeNull();
});

it('prevents moving to other users lot', function () {
    $otherUser = User::factory()->create();
    $otherLot = Lot::factory()->forUser($otherUser)->create();

    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $item = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'lot_id' => $this->sourceLot->id,
        'in_collection' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/inventory/change-lot', [
            'ids' => [$item->id],
            'lot_id' => $otherLot->id,
        ]);

    $response->assertNotFound();

    // Item should not be moved
    $item->refresh();
    expect($item->lot_id)->toBe($this->sourceLot->id);
});

it('only moves inventory items not collection items', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $collectionItem = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'lot_id' => null,
        'in_collection' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/inventory/change-lot', [
            'ids' => [$collectionItem->id],
            'lot_id' => $this->targetLot->id,
        ]);

    $response->assertRedirect();

    // Collection item should not be moved
    $collectionItem->refresh();
    expect($collectionItem->lot_id)->toBeNull();
});

it('validates lot_id is required', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    $item = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->post('/g/fab/inventory/change-lot', [
            'ids' => [$item->id],
        ]);

    $response->assertSessionHasErrors('lot_id');
});

it('validates ids are required', function () {
    $response = $this->actingAs($this->user)
        ->post('/g/fab/inventory/change-lot', [
            'lot_id' => $this->targetLot->id,
        ]);

    $response->assertSessionHasErrors('ids');
});
