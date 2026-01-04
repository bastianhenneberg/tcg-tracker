<?php

use App\Models\Box;
use App\Models\Fab\FabCard;
use App\Models\Fab\FabInventory;
use App\Models\Fab\FabPrinting;
use App\Models\Game;
use App\Models\Lot;
use App\Models\User;

uses(Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    // Ensure FAB game exists
    Game::firstOrCreate(
        ['slug' => 'fab'],
        ['name' => 'Flesh and Blood', 'is_official' => true]
    );
});

describe('Unified Scanner Index', function () {
    it('requires authentication', function () {
        $this->get('/scanner')->assertRedirect('/login');
    });

    it('displays scanner page with game switcher', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/scanner')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->component('scanner/index')
                ->has('games')
                ->has('selectedGame')
                ->has('lots')
                ->has('boxes')
                ->has('ollamaStatus')
                ->has('conditions')
                ->has('foilings')
                ->has('languages')
            );
    });

    it('defaults to FAB game', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/scanner')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->where('selectedGame.slug', 'fab')
            );
    });

    it('switches to selected game', function () {
        $user = User::factory()->create();
        Game::firstOrCreate(
            ['slug' => 'magic-the-gathering'],
            ['name' => 'Magic: The Gathering', 'is_official' => true]
        );

        $this->actingAs($user)
            ->get('/scanner?game=magic-the-gathering')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->where('selectedGame.slug', 'magic-the-gathering')
            );
    });

    it('shows user lots and boxes', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);
        Lot::factory()->count(3)->create(['user_id' => $user->id, 'box_id' => $box->id]);

        $this->actingAs($user)
            ->get('/scanner')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->has('lots', 3)
                ->has('boxes', 1)
            );
    });

    it('does not show other users lots', function () {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        Lot::factory()->count(2)->create(['user_id' => $otherUser->id]);
        Lot::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->get('/scanner')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->has('lots', 1)
            );
    });

    it('returns search results via query param for FAB', function () {
        $user = User::factory()->create();
        $card = FabCard::factory()->create(['name' => 'Lightning Bolt']);
        FabPrinting::factory()->create(['fab_card_id' => $card->id]);

        $this->actingAs($user)
            ->get('/scanner?game=fab&q=Lightning')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->has('searchResults', 1)
                ->where('searchQuery', 'Lightning')
            );
    });
});

describe('Unified Scanner Create Lot', function () {
    it('requires authentication', function () {
        $this->post('/scanner/lot', [])
            ->assertRedirect('/login');
    });

    it('creates new lot', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/scanner/lot', [])
            ->assertRedirect();

        expect(Lot::where('user_id', $user->id)->count())->toBe(1);
    });

    it('creates lot with box', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post('/scanner/lot', [
                'box_id' => $box->id,
            ])
            ->assertRedirect();

        expect(Lot::where('user_id', $user->id)->first()->box_id)->toBe($box->id);
    });
});

describe('Unified Scanner Confirm', function () {
    it('requires authentication', function () {
        $this->post('/scanner/confirm', [])
            ->assertRedirect('/login');
    });

    it('validates required fields', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/scanner/confirm', [])
            ->assertSessionHasErrors(['game', 'lot_id', 'printing_id', 'condition']);
    });

    it('adds FAB card to inventory', function () {
        $user = User::factory()->create();
        $lot = Lot::factory()->create(['user_id' => $user->id]);
        $printing = FabPrinting::factory()->create();

        $this->actingAs($user)
            ->post('/scanner/confirm', [
                'game' => 'fab',
                'lot_id' => $lot->id,
                'printing_id' => $printing->id,
                'condition' => 'NM',
            ])
            ->assertRedirect()
            ->assertSessionHas('scanner.confirmed');

        expect(FabInventory::where('lot_id', $lot->id)->count())->toBe(1);
    });

    it('prevents adding to other users lot', function () {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $lot = Lot::factory()->create(['user_id' => $otherUser->id]);
        $printing = FabPrinting::factory()->create();

        $this->actingAs($user)
            ->post('/scanner/confirm', [
                'game' => 'fab',
                'lot_id' => $lot->id,
                'printing_id' => $printing->id,
                'condition' => 'NM',
            ])
            ->assertForbidden();
    });
});
