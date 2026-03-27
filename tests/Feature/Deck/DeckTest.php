<?php

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckZone;
use App\Models\Game;
use App\Models\GameFormat;
use App\Models\UnifiedCard;
use App\Models\User;
use App\Services\DeckbuilderService;
use App\Services\DeckValidationService;

beforeEach(function () {
    $this->user = User::factory()->create();

    // Ensure game and format exist
    $this->game = Game::firstOrCreate(
        ['slug' => 'fab'],
        ['name' => 'Flesh and Blood', 'is_official' => true]
    );

    $this->format = GameFormat::firstOrCreate(
        ['game_id' => $this->game->id, 'slug' => 'blitz'],
        ['name' => 'Blitz', 'is_active' => true, 'sort_order' => 0]
    );

    // Ensure zones exist
    $this->artisan('db:seed', ['--class' => 'DeckZonesSeeder']);
});

describe('Deck CRUD', function () {
    it('can create a deck', function () {
        $this->actingAs($this->user)
            ->post('/g/fab/decks', [
                'name' => 'Test Deck',
                'game_format_id' => $this->format->id,
                'description' => 'Test description',
                'is_public' => false,
                'use_collection_only' => false,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('decks', [
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
            'name' => 'Test Deck',
        ]);
    });

    it('can view own deck', function () {
        $deck = Deck::factory()->create([
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
        ]);

        $this->actingAs($this->user)
            ->get("/g/fab/decks/{$deck->id}")
            ->assertSuccessful();
    });

    it('can view public deck of other user', function () {
        $otherUser = User::factory()->create();
        $deck = Deck::factory()->create([
            'user_id' => $otherUser->id,
            'game_format_id' => $this->format->id,
            'is_public' => true,
        ]);

        $this->actingAs($this->user)
            ->get("/g/fab/decks/{$deck->id}")
            ->assertSuccessful();
    });

    it('cannot view private deck of other user', function () {
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

    it('can update own deck', function () {
        $deck = Deck::factory()->create([
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
        ]);

        $this->actingAs($this->user)
            ->patch("/g/fab/decks/{$deck->id}", [
                'name' => 'Updated Name',
            ])
            ->assertRedirect();

        expect($deck->fresh()->name)->toBe('Updated Name');
    });

    it('can delete own deck', function () {
        $deck = Deck::factory()->create([
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
        ]);

        $this->actingAs($this->user)
            ->delete("/g/fab/decks/{$deck->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('decks', ['id' => $deck->id]);
    });
});

describe('Deck Builder', function () {
    it('can add card to deck', function () {
        $deck = Deck::factory()->create([
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
        ]);

        $card = UnifiedCard::where('game', 'fab')->first();
        $printing = $card?->printings()->first();

        if (! $printing) {
            $this->markTestSkipped('No FAB cards in database');
        }

        $this->actingAs($this->user)
            ->postJson("/g/fab/decks/{$deck->id}/cards", [
                'printing_id' => $printing->id,
                'zone' => 'main',
                'quantity' => 1,
            ])
            ->assertSuccessful()
            ->assertJsonStructure([
                'success',
                'deckCard',
                'validation',
                'statistics',
            ]);

        $this->assertDatabaseHas('deck_cards', [
            'deck_id' => $deck->id,
            'printing_id' => $printing->id,
        ]);
    });

    it('can remove card from deck', function () {
        $deck = Deck::factory()->create([
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
        ]);

        $card = UnifiedCard::where('game', 'fab')->first();
        $printing = $card?->printings()->first();

        if (! $printing) {
            $this->markTestSkipped('No FAB cards in database');
        }

        $zone = DeckZone::where('game_format_id', $this->format->id)
            ->where('slug', 'main')
            ->first();

        $deckCard = DeckCard::create([
            'deck_id' => $deck->id,
            'deck_zone_id' => $zone->id,
            'printing_id' => $printing->id,
            'quantity' => 1,
            'position' => 0,
        ]);

        $this->actingAs($this->user)
            ->deleteJson("/g/fab/decks/{$deck->id}/cards/{$deckCard->id}")
            ->assertSuccessful();

        $this->assertDatabaseMissing('deck_cards', ['id' => $deckCard->id]);
    });

    it('can move card between zones', function () {
        $deck = Deck::factory()->create([
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
        ]);

        $card = UnifiedCard::where('game', 'fab')->first();
        $printing = $card?->printings()->first();

        if (! $printing) {
            $this->markTestSkipped('No FAB cards in database');
        }

        $mainZone = DeckZone::where('game_format_id', $this->format->id)
            ->where('slug', 'main')
            ->first();

        $deckCard = DeckCard::create([
            'deck_id' => $deck->id,
            'deck_zone_id' => $mainZone->id,
            'printing_id' => $printing->id,
            'quantity' => 1,
            'position' => 0,
        ]);

        $this->actingAs($this->user)
            ->patchJson("/g/fab/decks/{$deck->id}/cards/{$deckCard->id}/move", [
                'target_zone' => 'sideboard',
            ])
            ->assertSuccessful();

        $sideboardZone = DeckZone::where('game_format_id', $this->format->id)
            ->where('slug', 'sideboard')
            ->first();

        expect($deckCard->fresh()->deck_zone_id)->toBe($sideboardZone->id);
    });

    it('can update card quantity', function () {
        $deck = Deck::factory()->create([
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
        ]);

        $card = UnifiedCard::where('game', 'fab')->first();
        $printing = $card?->printings()->first();

        if (! $printing) {
            $this->markTestSkipped('No FAB cards in database');
        }

        $zone = DeckZone::where('game_format_id', $this->format->id)
            ->where('slug', 'main')
            ->first();

        $deckCard = DeckCard::create([
            'deck_id' => $deck->id,
            'deck_zone_id' => $zone->id,
            'printing_id' => $printing->id,
            'quantity' => 1,
            'position' => 0,
        ]);

        $this->actingAs($this->user)
            ->patchJson("/g/fab/decks/{$deck->id}/cards/{$deckCard->id}/quantity", [
                'quantity' => 3,
            ])
            ->assertSuccessful();

        expect($deckCard->fresh()->quantity)->toBe(3);
    });
});

describe('Deck Validation', function () {
    it('validates zone limits', function () {
        $deck = Deck::factory()->create([
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
        ]);

        $validation = app(DeckValidationService::class)->validateDeck($deck);

        expect($validation['valid'])->toBeFalse();
        expect($validation['errors'])->toBeArray();
        // Should have errors for missing Hero and Main deck cards
        expect(collect($validation['errors'])->pluck('type')->toArray())
            ->toContain('zone_minimum');
    });

    it('exports deck as text', function () {
        $deck = Deck::factory()->create([
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
            'name' => 'Export Test',
        ]);

        $text = app(DeckbuilderService::class)->exportAsText($deck);

        expect($text)->toContain('// Export Test');
        expect($text)->toContain('// Format: Blitz');
    });
});

describe('Deck Search', function () {
    it('can search cards for deck', function () {
        $deck = Deck::factory()->create([
            'user_id' => $this->user->id,
            'game_format_id' => $this->format->id,
        ]);

        $this->actingAs($this->user)
            ->getJson("/g/fab/decks/{$deck->id}/search?q=ninja")
            ->assertSuccessful()
            ->assertJsonStructure([
                'data',
                'current_page',
                'last_page',
            ]);
    });
});
