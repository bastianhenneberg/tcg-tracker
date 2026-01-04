<?php

use App\Models\Box;
use App\Models\Game;
use App\Models\Lot;
use App\Models\UnifiedCard;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\User;
use App\Services\Fab\FabCardMatcherService;
use App\Services\OllamaService;

uses(Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    // Seed the FAB game as it's required by ScannerController
    Game::create([
        'slug' => 'fab',
        'name' => 'Flesh and Blood',
        'is_official' => true,
    ]);
});

describe('Scanner Index', function () {
    it('requires authentication', function () {
        $this->get('/scanner')->assertRedirect('/login');
    });

    it('displays scanner page with default game', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/scanner')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->component('scanner/index')
                ->has('games')
                ->has('lots')
                ->has('boxes')
                ->has('ollamaStatus')
                ->has('conditions')
                ->has('selectedGame')
            );
    });

    it('displays scanner page with specific game', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/scanner?game=fab')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->component('scanner/index')
                ->where('selectedGame.slug', 'fab')
            );
    });

    it('shows user lots and boxes', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);
        Lot::factory()->count(3)->create(['user_id' => $user->id, 'box_id' => $box->id]);

        $this->actingAs($user)
            ->get('/scanner?game=fab')
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
            ->get('/scanner?game=fab')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->has('lots', 1)
            );
    });

    it('returns search results via query param', function () {
        $user = User::factory()->create();
        $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Lightning Bolt']);
        UnifiedPrinting::factory()->forCard($card)->create();

        $this->actingAs($user)
            ->get('/scanner?game=fab&q=Lightning')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->has('searchResults', 1)
                ->where('searchQuery', 'Lightning')
            );
    });
});

describe('Scanner Confirm', function () {
    it('requires authentication', function () {
        $this->postJson('/scanner/confirm', [])
            ->assertUnauthorized();
    });

    it('validates required fields for FAB', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/scanner/confirm', ['game' => 'fab'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lot_id', 'printing_id', 'condition']);
    });

    it('adds FAB card to inventory', function () {
        $user = User::factory()->create();
        $lot = Lot::factory()->create(['user_id' => $user->id]);
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();

        $this->actingAs($user)
            ->post('/scanner/confirm', [
                'game' => 'fab',
                'lot_id' => $lot->id,
                'printing_id' => $printing->id,
                'condition' => 'NM',
            ])
            ->assertRedirect();

        expect(UnifiedInventory::count())->toBe(1);
        expect(UnifiedInventory::first())
            ->user_id->toBe($user->id)
            ->lot_id->toBe($lot->id)
            ->printing_id->toBe($printing->id)
            ->condition->toBe('NM');

        expect(UnifiedInventory::first()->extra['position_in_lot'])->toBe(1);
    });

    it('increments position in lot', function () {
        $user = User::factory()->create();
        $lot = Lot::factory()->create(['user_id' => $user->id]);
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing1 = UnifiedPrinting::factory()->forCard($card)->create();

        // Create existing inventory item with position 5
        UnifiedInventory::create([
            'user_id' => $user->id,
            'lot_id' => $lot->id,
            'printing_id' => $printing1->id,
            'condition' => 'NM',
            'language' => 'EN',
            'quantity' => 1,
            'in_collection' => false,
            'extra' => ['position_in_lot' => 5],
        ]);

        $printing2 = UnifiedPrinting::factory()->forCard($card)->create();

        $this->actingAs($user)
            ->post('/scanner/confirm', [
                'game' => 'fab',
                'lot_id' => $lot->id,
                'printing_id' => $printing2->id,
                'condition' => 'LP',
            ])
            ->assertRedirect();

        expect(UnifiedInventory::latest('id')->first()->extra['position_in_lot'])->toBe(6);
    });

    it('prevents adding to other users lot', function () {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $lot = Lot::factory()->create(['user_id' => $otherUser->id]);
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();

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

describe('Scanner Create Lot', function () {
    it('requires authentication', function () {
        $this->postJson('/scanner/lot', [])
            ->assertUnauthorized();
    });

    it('creates new lot', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/scanner/lot', [])
            ->assertRedirect();

        expect(Lot::count())->toBe(1);
        expect(Lot::first())
            ->user_id->toBe($user->id)
            ->lot_number->toBe(1);
    });

    it('creates lot with box', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post('/scanner/lot', ['box_id' => $box->id])
            ->assertRedirect();

        expect(Lot::first()->box_id)->toBe($box->id);
    });

    it('increments lot number per user', function () {
        $user = User::factory()->create();
        Lot::factory()->create(['user_id' => $user->id, 'lot_number' => 5]);

        $this->actingAs($user)
            ->post('/scanner/lot', [])
            ->assertRedirect();

        expect(Lot::latest('id')->first()->lot_number)->toBe(6);
    });

    it('prevents using other users box', function () {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $otherUser->id]);

        $this->actingAs($user)
            ->post('/scanner/lot', ['box_id' => $box->id])
            ->assertForbidden();
    });
});

describe('FabCardMatcherService', function () {
    it('finds card by collector number', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create(['collector_number' => 'MST131']);

        $service = new FabCardMatcherService;
        $result = $service->findMatch([
            'collector_number' => 'MST131',
        ]);

        expect($result['match'])->not->toBeNull();
        expect($result['match']->id)->toBe($printing->id);
        expect($result['confidence'])->toBe('high');
    });

    it('finds card by name', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Aether Flare']);
        $printing = UnifiedPrinting::factory()->forCard($card)->create();

        $service = new FabCardMatcherService;
        $result = $service->findMatch([
            'card_name' => 'Aether Flare',
        ]);

        expect($result['match'])->not->toBeNull();
        expect($result['match']->id)->toBe($printing->id);
    });

    it('returns no match for unknown card', function () {
        $service = new FabCardMatcherService;
        $result = $service->findMatch([
            'card_name' => 'Nonexistent Card XYZ',
        ]);

        expect($result['match'])->toBeNull();
        expect($result['confidence'])->toBe('none');
    });

    it('searches cards', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Mystic Warrior']);
        UnifiedPrinting::factory()->forCard($card)->create();
        UnifiedPrinting::factory()->forCard($card)->create();

        $service = new FabCardMatcherService;
        $results = $service->search('Mystic');

        expect($results)->toHaveCount(2);
    });
});

describe('OllamaService', function () {
    it('returns status information', function () {
        $service = new OllamaService;
        $status = $service->getStatus();

        expect($status)->toHaveKeys(['available', 'host', 'model']);
        expect($status['host'])->toBe(config('services.ollama.host'));
        expect($status['model'])->toBe(config('services.ollama.model'));
    });
});
