<?php

use App\Models\Binder;
use App\Models\BinderPage;
use App\Models\UnifiedInventory;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->binder = Binder::factory()->create(['user_id' => $this->user->id]);
    $this->binderPage = BinderPage::factory()->create([
        'user_id' => $this->user->id,
        'binder_id' => $this->binder->id,
        'page_number' => 1,
    ]);
});

it('can assign a card to a binder slot', function () {
    $inventory = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'in_collection' => true,
        'binder_page_id' => null,
        'binder_slot' => null,
    ]);

    $this->actingAs($this->user)
        ->post(route('binder-pages.assign', $this->binderPage), [
            'inventory_id' => $inventory->id,
            'slot' => 1,
        ])
        ->assertRedirect();

    $inventory->refresh();
    expect($inventory->binder_page_id)->toBe($this->binderPage->id);
    expect($inventory->binder_slot)->toBe(1);
});

it('cannot assign more than 4 cards to a slot', function () {
    // Create 4 cards already in slot 1
    for ($i = 0; $i < 4; $i++) {
        UnifiedInventory::factory()->create([
            'user_id' => $this->user->id,
            'in_collection' => true,
            'binder_page_id' => $this->binderPage->id,
            'binder_slot' => 1,
        ]);
    }

    // Try to add a 5th card
    $inventory = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'in_collection' => true,
        'binder_page_id' => null,
        'binder_slot' => null,
    ]);

    $this->actingAs($this->user)
        ->post(route('binder-pages.assign', $this->binderPage), [
            'inventory_id' => $inventory->id,
            'slot' => 1,
        ])
        ->assertSessionHasErrors('slot');

    $inventory->refresh();
    expect($inventory->binder_page_id)->toBeNull();
});

it('can remove a card from a binder', function () {
    $inventory = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'in_collection' => true,
        'binder_page_id' => $this->binderPage->id,
        'binder_slot' => 1,
    ]);

    $this->actingAs($this->user)
        ->post(route('binder-pages.remove', $this->binderPage), [
            'inventory_id' => $inventory->id,
        ])
        ->assertRedirect();

    $inventory->refresh();
    expect($inventory->binder_page_id)->toBeNull();
    expect($inventory->binder_slot)->toBeNull();
});

it('can move a card to a different slot', function () {
    $inventory = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'in_collection' => true,
        'binder_page_id' => $this->binderPage->id,
        'binder_slot' => 1,
    ]);

    $this->actingAs($this->user)
        ->post(route('binder-pages.move-to-slot', $this->binderPage), [
            'inventory_id' => $inventory->id,
            'to_slot' => 5,
        ])
        ->assertRedirect();

    $inventory->refresh();
    expect($inventory->binder_slot)->toBe(5);
});

it('cannot assign cards from another user', function () {
    $otherUser = User::factory()->create();
    $inventory = UnifiedInventory::factory()->create([
        'user_id' => $otherUser->id,
        'in_collection' => true,
        'binder_page_id' => null,
        'binder_slot' => null,
    ]);

    $this->actingAs($this->user)
        ->post(route('binder-pages.assign', $this->binderPage), [
            'inventory_id' => $inventory->id,
            'slot' => 1,
        ])
        ->assertStatus(404);
});

it('returns available cards for search', function () {
    // Create some cards in collection but not in binder
    $card1 = UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'in_collection' => true,
        'binder_page_id' => null,
    ]);

    // Create a card already in a binder (should not appear)
    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'in_collection' => true,
        'binder_page_id' => $this->binderPage->id,
        'binder_slot' => 1,
    ]);

    $this->actingAs($this->user)
        ->getJson(route('binder-pages.available-cards', $this->binderPage))
        ->assertOk()
        ->assertJsonStructure(['cards']);
});

it('cannot access binder page of another user', function () {
    $otherUser = User::factory()->create();
    $otherBinder = Binder::factory()->create(['user_id' => $otherUser->id]);
    $otherPage = BinderPage::factory()->create([
        'user_id' => $otherUser->id,
        'binder_id' => $otherBinder->id,
    ]);

    $this->actingAs($this->user)
        ->post(route('binder-pages.assign', $otherPage), [
            'inventory_id' => 1,
            'slot' => 1,
        ])
        ->assertForbidden();
});
