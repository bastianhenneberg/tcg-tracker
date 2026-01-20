<?php

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckZone;
use App\Models\Game;
use App\Models\GameFormat;
use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
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

    // Create deck for user
    $this->deck = Deck::factory()->create([
        'user_id' => $this->user->id,
        'game_format_id' => $this->format->id,
    ]);

    // Create zones
    $this->mainZone = DeckZone::factory()
        ->forFormat($this->format)
        ->create(['slug' => 'main', 'name' => 'Main', 'sort_order' => 0]);

    $this->sideboardZone = DeckZone::factory()
        ->forFormat($this->format)
        ->create(['slug' => 'sideboard', 'name' => 'Sideboard', 'sort_order' => 1]);

    // Create card and printing
    $this->card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
    $this->printing = UnifiedPrinting::factory()->forCard($this->card)->create();
});

describe('DeckBuilderActions', function () {
    describe('addCard', function () {
        it('adds a card to the deck', function () {
            $response = $this->actingAs($this->user)
                ->postJson("/g/fab/decks/{$this->deck->id}/cards", [
                    'printing_id' => $this->printing->id,
                    'zone' => 'main',
                    'quantity' => 2,
                ]);

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'success',
                    'deckCard',
                    'validation',
                    'statistics',
                ])
                ->assertJson(['success' => true]);

            $this->assertDatabaseHas('deck_cards', [
                'deck_id' => $this->deck->id,
                'printing_id' => $this->printing->id,
                'quantity' => 2,
            ]);
        });

        it('denies non-owner from adding cards', function () {
            $otherUser = User::factory()->create();

            $this->actingAs($otherUser)
                ->postJson("/g/fab/decks/{$this->deck->id}/cards", [
                    'printing_id' => $this->printing->id,
                    'zone' => 'main',
                ])
                ->assertForbidden();
        });
    });

    describe('removeCard', function () {
        it('removes a card from the deck', function () {
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create();

            $response = $this->actingAs($this->user)
                ->deleteJson("/g/fab/decks/{$this->deck->id}/cards/{$deckCard->id}");

            $response->assertSuccessful()
                ->assertJson(['success' => true]);

            $this->assertDatabaseMissing('deck_cards', ['id' => $deckCard->id]);
        });

        it('denies non-owner from removing cards', function () {
            $otherUser = User::factory()->create();
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create();

            $this->actingAs($otherUser)
                ->deleteJson("/g/fab/decks/{$this->deck->id}/cards/{$deckCard->id}")
                ->assertForbidden();

            $this->assertDatabaseHas('deck_cards', ['id' => $deckCard->id]);
        });
    });

    describe('moveCard', function () {
        it('moves a card between zones', function () {
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create();

            $response = $this->actingAs($this->user)
                ->patchJson("/g/fab/decks/{$this->deck->id}/cards/{$deckCard->id}/move", [
                    'target_zone' => 'sideboard',
                ]);

            $response->assertSuccessful()
                ->assertJson(['success' => true])
                ->assertJsonPath('deckCard.deck_zone_id', $this->sideboardZone->id);

            expect($deckCard->fresh()->deck_zone_id)->toBe($this->sideboardZone->id);
        });

        it('denies non-owner from moving cards', function () {
            $otherUser = User::factory()->create();
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create();

            $this->actingAs($otherUser)
                ->patchJson("/g/fab/decks/{$this->deck->id}/cards/{$deckCard->id}/move", [
                    'target_zone' => 'sideboard',
                ])
                ->assertForbidden();
        });
    });

    describe('updateQuantity', function () {
        it('updates card quantity', function () {
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 1]);

            $response = $this->actingAs($this->user)
                ->patchJson("/g/fab/decks/{$this->deck->id}/cards/{$deckCard->id}/quantity", [
                    'quantity' => 3,
                ]);

            $response->assertSuccessful()
                ->assertJson(['success' => true]);

            expect($deckCard->fresh()->quantity)->toBe(3);
        });

        it('removes card when quantity is zero', function () {
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 2]);

            $response = $this->actingAs($this->user)
                ->patchJson("/g/fab/decks/{$this->deck->id}/cards/{$deckCard->id}/quantity", [
                    'quantity' => 0,
                ]);

            $response->assertSuccessful()
                ->assertJson(['success' => true, 'deckCard' => null]);

            $this->assertDatabaseMissing('deck_cards', ['id' => $deckCard->id]);
        });

        it('denies non-owner from updating quantity', function () {
            $otherUser = User::factory()->create();
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 2]);

            $this->actingAs($otherUser)
                ->patchJson("/g/fab/decks/{$this->deck->id}/cards/{$deckCard->id}/quantity", [
                    'quantity' => 99,
                ])
                ->assertForbidden();

            expect($deckCard->fresh()->quantity)->toBe(2);
        });
    });

    describe('searchCards', function () {
        it('returns search results', function () {
            // Create some cards for the game
            $card1 = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Ninja Strike']);
            $card2 = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Warrior Blade']);
            UnifiedPrinting::factory()->forCard($card1)->create();
            UnifiedPrinting::factory()->forCard($card2)->create();

            $response = $this->actingAs($this->user)
                ->getJson("/g/fab/decks/{$this->deck->id}/search?q=ninja");

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'data',
                    'current_page',
                    'last_page',
                ]);
        });

        it('allows viewing deck to search', function () {
            // Public deck - even non-owner can search
            $publicDeck = Deck::factory()->public()->create([
                'user_id' => $this->user->id,
                'game_format_id' => $this->format->id,
            ]);

            $otherUser = User::factory()->create();

            $this->actingAs($otherUser)
                ->getJson("/g/fab/decks/{$publicDeck->id}/search?q=test")
                ->assertSuccessful();
        });
    });

    describe('export', function () {
        it('exports deck as text', function () {
            DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 3]);

            $response = $this->actingAs($this->user)
                ->get("/g/fab/decks/{$this->deck->id}/export");

            $response->assertSuccessful()
                ->assertHeader('content-type', 'text/plain; charset=utf-8');

            $content = $response->streamedContent();
            expect($content)->toContain("// {$this->deck->name}")
                ->and($content)->toContain("3x {$this->card->name}");
        });

        it('exports deck as json', function () {
            DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 2]);

            $response = $this->actingAs($this->user)
                ->get("/g/fab/decks/{$this->deck->id}/export/json");

            $response->assertSuccessful()
                ->assertJsonStructure([
                    'deck',
                    'zones',
                    'validation',
                    'statistics',
                ]);
        });

        it('allows public deck export by non-owner', function () {
            $publicDeck = Deck::factory()->public()->create([
                'user_id' => $this->user->id,
                'game_format_id' => $this->format->id,
            ]);

            $otherUser = User::factory()->create();

            $this->actingAs($otherUser)
                ->get("/g/fab/decks/{$publicDeck->id}/export")
                ->assertSuccessful();
        });
    });
});
