<?php

use App\Models\Deck;
use App\Models\Game;
use App\Models\GameFormat;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();

    // Create game and format
    $this->game = Game::factory()->create(['slug' => 'fab', 'name' => 'Flesh and Blood']);
    $this->format = GameFormat::factory()->create([
        'game_id' => $this->game->id,
        'slug' => 'blitz',
        'name' => 'Blitz',
    ]);
});

describe('DeckController', function () {
    describe('index', function () {
        it('shows only own decks', function () {
            // Create decks for current user
            $ownDecks = Deck::factory()->count(3)->create([
                'user_id' => $this->user->id,
                'game_format_id' => $this->format->id,
            ]);

            // Create decks for other user
            $otherUser = User::factory()->create();
            Deck::factory()->count(2)->create([
                'user_id' => $otherUser->id,
                'game_format_id' => $this->format->id,
            ]);

            $response = $this->actingAs($this->user)
                ->get('/g/fab/decks');

            $response->assertSuccessful()
                ->assertInertia(fn ($page) => $page
                    ->has('decks.data', 3)
                    ->where('decks.total', 3)
                );
        });

        it('requires authentication', function () {
            $this->get('/g/fab/decks')
                ->assertRedirect('/login');
        });
    });

    describe('store', function () {
        it('creates a new deck', function () {
            $this->actingAs($this->user)
                ->post('/g/fab/decks', [
                    'name' => 'My New Deck',
                    'game_format_id' => $this->format->id,
                    'description' => 'A test deck',
                    'is_public' => false,
                    'use_collection_only' => false,
                ])
                ->assertRedirect();

            $this->assertDatabaseHas('decks', [
                'user_id' => $this->user->id,
                'name' => 'My New Deck',
                'game_format_id' => $this->format->id,
            ]);
        });

        it('requires authentication', function () {
            $this->post('/g/fab/decks', [
                'name' => 'My New Deck',
                'game_format_id' => $this->format->id,
            ])
                ->assertRedirect('/login');
        });

        it('validates required fields', function () {
            $this->actingAs($this->user)
                ->post('/g/fab/decks', [])
                ->assertSessionHasErrors(['name', 'game_format_id']);
        });
    });

    describe('show', function () {
        it('shows deck details to owner', function () {
            $deck = Deck::factory()->create([
                'user_id' => $this->user->id,
                'game_format_id' => $this->format->id,
            ]);

            $this->actingAs($this->user)
                ->get("/g/fab/decks/{$deck->id}")
                ->assertSuccessful();
        });

        it('shows public deck to non-owner', function () {
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->public()->create([
                'user_id' => $otherUser->id,
                'game_format_id' => $this->format->id,
            ]);

            $this->actingAs($this->user)
                ->get("/g/fab/decks/{$deck->id}")
                ->assertSuccessful();
        });

        it('denies access to private deck for non-owner', function () {
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->create([
                'user_id' => $otherUser->id,
                'game_format_id' => $this->format->id,
                'is_public' => false,
            ]);

            $this->actingAs($this->user)
                ->get("/g/fab/decks/{$deck->id}")
                ->assertForbidden();
        });
    });

    describe('update', function () {
        it('updates deck for owner', function () {
            $deck = Deck::factory()->create([
                'user_id' => $this->user->id,
                'game_format_id' => $this->format->id,
                'name' => 'Original Name',
            ]);

            $this->actingAs($this->user)
                ->patch("/g/fab/decks/{$deck->id}", [
                    'name' => 'Updated Name',
                ])
                ->assertRedirect();

            expect($deck->fresh()->name)->toBe('Updated Name');
        });

        it('denies update for non-owner', function () {
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->create([
                'user_id' => $otherUser->id,
                'game_format_id' => $this->format->id,
            ]);

            $this->actingAs($this->user)
                ->patch("/g/fab/decks/{$deck->id}", [
                    'name' => 'Hacked Name',
                ])
                ->assertForbidden();
        });

        it('denies update for non-owner even on public deck', function () {
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->public()->create([
                'user_id' => $otherUser->id,
                'game_format_id' => $this->format->id,
            ]);

            $this->actingAs($this->user)
                ->patch("/g/fab/decks/{$deck->id}", [
                    'name' => 'Hacked Name',
                ])
                ->assertForbidden();
        });
    });

    describe('destroy', function () {
        it('deletes deck for owner', function () {
            $deck = Deck::factory()->create([
                'user_id' => $this->user->id,
                'game_format_id' => $this->format->id,
            ]);

            $this->actingAs($this->user)
                ->delete("/g/fab/decks/{$deck->id}")
                ->assertRedirect();

            $this->assertDatabaseMissing('decks', ['id' => $deck->id]);
        });

        it('denies delete for non-owner', function () {
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->create([
                'user_id' => $otherUser->id,
                'game_format_id' => $this->format->id,
            ]);

            $this->actingAs($this->user)
                ->delete("/g/fab/decks/{$deck->id}")
                ->assertForbidden();

            $this->assertDatabaseHas('decks', ['id' => $deck->id]);
        });
    });

    describe('unauthorized access', function () {
        it('redirects guest from index to login', function () {
            $this->get('/g/fab/decks')
                ->assertRedirect('/login');
        });

        it('redirects guest from create to login', function () {
            $this->get('/g/fab/decks/create')
                ->assertRedirect('/login');
        });

        it('redirects guest from store to login', function () {
            $this->post('/g/fab/decks', ['name' => 'Test'])
                ->assertRedirect('/login');
        });
    });
});
