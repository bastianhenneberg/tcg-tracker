<?php

use App\Models\Binder;
use App\Models\BinderPage;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('displays binders index page', function () {
    $this->actingAs($this->user)
        ->get('/binders')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('collection/binders/index')
            ->has('binders')
            ->has('filters')
        );
});

it('returns paginated binders for authenticated user', function () {
    // Create binders for our user
    Binder::factory()->count(3)->create(['user_id' => $this->user->id]);

    // Create a binder for another user (should not appear)
    Binder::factory()->create(['user_id' => User::factory()->create()->id]);

    $this->actingAs($this->user)
        ->get('/binders')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('collection/binders/index')
            ->has('binders.data', 3)
        );
});

it('can search binders by name', function () {
    Binder::factory()->create(['user_id' => $this->user->id, 'name' => 'FaB Favoriten']);
    Binder::factory()->create(['user_id' => $this->user->id, 'name' => 'MTG Sammlung']);

    $this->actingAs($this->user)
        ->get('/binders?search=FaB')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('binders.data', 1)
            ->where('binders.data.0.name', 'FaB Favoriten')
        );
});

it('can search binders by description', function () {
    Binder::factory()->create(['user_id' => $this->user->id, 'name' => 'Binder 1', 'description' => 'Seltene Karten']);
    Binder::factory()->create(['user_id' => $this->user->id, 'name' => 'Binder 2', 'description' => 'Commons']);

    $this->actingAs($this->user)
        ->get('/binders?search=Seltene')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('binders.data', 1)
            ->where('binders.data.0.name', 'Binder 1')
        );
});

it('can sort binders by name', function () {
    Binder::factory()->create(['user_id' => $this->user->id, 'name' => 'Zebra Binder']);
    Binder::factory()->create(['user_id' => $this->user->id, 'name' => 'Alpha Binder']);

    $this->actingAs($this->user)
        ->get('/binders?sort=name&direction=asc')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('binders.data.0.name', 'Alpha Binder')
            ->where('binders.data.1.name', 'Zebra Binder')
        );

    $this->actingAs($this->user)
        ->get('/binders?sort=name&direction=desc')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('binders.data.0.name', 'Zebra Binder')
            ->where('binders.data.1.name', 'Alpha Binder')
        );
});

it('includes pages count in response', function () {
    $binder = Binder::factory()->create(['user_id' => $this->user->id]);
    BinderPage::factory()->count(3)->create([
        'binder_id' => $binder->id,
        'user_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)
        ->get('/binders')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('binders.data.0.pages_count', 3)
        );
});

it('returns filter values in response', function () {
    $this->actingAs($this->user)
        ->get('/binders?search=test&sort=created_at&direction=desc')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.search', 'test')
            ->where('filters.sort', 'created_at')
            ->where('filters.direction', 'desc')
        );
});

it('requires authentication', function () {
    $this->get('/binders')
        ->assertRedirect('/login');
});
