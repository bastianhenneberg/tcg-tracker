<?php

use App\Models\Box;
use App\Models\Lot;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('displays boxes index page', function () {
    $this->actingAs($this->user)
        ->get('/boxes')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('inventory/boxes/index')
            ->has('boxes')
            ->has('filters')
        );
});

it('returns paginated boxes for authenticated user', function () {
    // Create boxes for our user
    Box::factory()->count(3)->create(['user_id' => $this->user->id]);

    // Create a box for another user (should not appear)
    Box::factory()->create(['user_id' => User::factory()->create()->id]);

    $this->actingAs($this->user)
        ->get('/boxes')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('inventory/boxes/index')
            ->has('boxes.data', 3)
        );
});

it('can search boxes by name', function () {
    Box::factory()->create(['user_id' => $this->user->id, 'name' => 'FaB Karten']);
    Box::factory()->create(['user_id' => $this->user->id, 'name' => 'MTG Sammlung']);

    $this->actingAs($this->user)
        ->get('/boxes?search=FaB')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('boxes.data', 1)
            ->where('boxes.data.0.name', 'FaB Karten')
        );
});

it('can search boxes by description', function () {
    Box::factory()->create(['user_id' => $this->user->id, 'name' => 'Box 1', 'description' => 'Regal oben']);
    Box::factory()->create(['user_id' => $this->user->id, 'name' => 'Box 2', 'description' => 'Schrank unten']);

    $this->actingAs($this->user)
        ->get('/boxes?search=Regal')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('boxes.data', 1)
            ->where('boxes.data.0.name', 'Box 1')
        );
});

it('can sort boxes by name', function () {
    Box::factory()->create(['user_id' => $this->user->id, 'name' => 'Zebra Box']);
    Box::factory()->create(['user_id' => $this->user->id, 'name' => 'Alpha Box']);

    $this->actingAs($this->user)
        ->get('/boxes?sort=name&direction=asc')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('boxes.data.0.name', 'Alpha Box')
            ->where('boxes.data.1.name', 'Zebra Box')
        );

    $this->actingAs($this->user)
        ->get('/boxes?sort=name&direction=desc')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('boxes.data.0.name', 'Zebra Box')
            ->where('boxes.data.1.name', 'Alpha Box')
        );
});

it('includes lots count in response', function () {
    $box = Box::factory()->create(['user_id' => $this->user->id]);
    Lot::factory()->count(5)->create(['box_id' => $box->id, 'user_id' => $this->user->id]);

    $this->actingAs($this->user)
        ->get('/boxes')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('boxes.data.0.lots_count', 5)
        );
});

it('returns filter values in response', function () {
    $this->actingAs($this->user)
        ->get('/boxes?search=test&sort=created_at&direction=desc')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.search', 'test')
            ->where('filters.sort', 'created_at')
            ->where('filters.direction', 'desc')
        );
});

it('requires authentication', function () {
    $this->get('/boxes')
        ->assertRedirect('/login');
});
