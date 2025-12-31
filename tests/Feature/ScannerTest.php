<?php

use App\Models\Box;
use App\Models\Fab\FabCard;
use App\Models\Fab\FabInventory;
use App\Models\Fab\FabPrinting;
use App\Models\Lot;
use App\Models\User;
use App\Services\Fab\FabCardMatcherService;
use App\Services\OllamaService;

uses(Illuminate\Foundation\Testing\RefreshDatabase::class);

describe('FaB Scanner Index', function () {
    it('requires authentication', function () {
        $this->get('/fab/scanner')->assertRedirect('/login');
    });

    it('displays scanner page', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/fab/scanner')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->component('fab/scanner')
                ->has('lots')
                ->has('boxes')
                ->has('ollamaStatus')
                ->has('conditions')
            );
    });

    it('shows user lots and boxes', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);
        Lot::factory()->count(3)->create(['user_id' => $user->id, 'box_id' => $box->id]);

        $this->actingAs($user)
            ->get('/fab/scanner')
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
            ->get('/fab/scanner')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->has('lots', 1)
            );
    });

    it('returns search results via query param', function () {
        $user = User::factory()->create();
        $card = FabCard::factory()->create(['name' => 'Lightning Bolt']);
        FabPrinting::factory()->create(['fab_card_id' => $card->id]);

        $this->actingAs($user)
            ->get('/fab/scanner?q=Lightning')
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page
                ->has('searchResults', 1)
                ->where('searchQuery', 'Lightning')
            );
    });
});

describe('FaB Scanner Confirm', function () {
    it('requires authentication', function () {
        $this->postJson('/fab/scanner/confirm', [])
            ->assertUnauthorized();
    });

    it('validates required fields', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/fab/scanner/confirm', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lot_id', 'fab_printing_id', 'condition']);
    });

    it('adds card to inventory', function () {
        $user = User::factory()->create();
        $lot = Lot::factory()->create(['user_id' => $user->id]);
        $printing = FabPrinting::factory()->create();

        $this->actingAs($user)
            ->post('/fab/scanner/confirm', [
                'lot_id' => $lot->id,
                'fab_printing_id' => $printing->id,
                'condition' => 'NM',
            ])
            ->assertRedirect();

        expect(FabInventory::count())->toBe(1);
        expect(FabInventory::first())
            ->user_id->toBe($user->id)
            ->lot_id->toBe($lot->id)
            ->fab_printing_id->toBe($printing->id)
            ->condition->toBe('NM')
            ->position_in_lot->toBe(1);
    });

    it('increments position in lot', function () {
        $user = User::factory()->create();
        $lot = Lot::factory()->create(['user_id' => $user->id]);
        $printing1 = FabPrinting::factory()->create();
        $printing2 = FabPrinting::factory()->create();

        FabInventory::factory()->create([
            'user_id' => $user->id,
            'lot_id' => $lot->id,
            'position_in_lot' => 5,
        ]);

        $this->actingAs($user)
            ->post('/fab/scanner/confirm', [
                'lot_id' => $lot->id,
                'fab_printing_id' => $printing1->id,
                'condition' => 'LP',
            ])
            ->assertRedirect();

        expect(FabInventory::latest('id')->first()->position_in_lot)->toBe(6);
    });

    it('prevents adding to other users lot', function () {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $lot = Lot::factory()->create(['user_id' => $otherUser->id]);
        $printing = FabPrinting::factory()->create();

        $this->actingAs($user)
            ->post('/fab/scanner/confirm', [
                'lot_id' => $lot->id,
                'fab_printing_id' => $printing->id,
                'condition' => 'NM',
            ])
            ->assertForbidden();
    });
});

describe('FaB Scanner Create Lot', function () {
    it('requires authentication', function () {
        $this->postJson('/fab/scanner/lot', [])
            ->assertUnauthorized();
    });

    it('creates new lot', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/fab/scanner/lot', [])
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
            ->post('/fab/scanner/lot', ['box_id' => $box->id])
            ->assertRedirect();

        expect(Lot::first()->box_id)->toBe($box->id);
    });

    it('increments lot number per user', function () {
        $user = User::factory()->create();
        Lot::factory()->create(['user_id' => $user->id, 'lot_number' => 5]);

        $this->actingAs($user)
            ->post('/fab/scanner/lot', [])
            ->assertRedirect();

        expect(Lot::latest('id')->first()->lot_number)->toBe(6);
    });

    it('prevents using other users box', function () {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $otherUser->id]);

        $this->actingAs($user)
            ->post('/fab/scanner/lot', ['box_id' => $box->id])
            ->assertForbidden();
    });
});

describe('FabCardMatcherService', function () {
    it('finds card by collector number', function () {
        $printing = FabPrinting::factory()->create(['collector_number' => 'MST131']);

        $service = new FabCardMatcherService;
        $result = $service->findMatch([
            'collector_number' => 'MST131',
        ]);

        expect($result['match'])->not->toBeNull();
        expect($result['match']->id)->toBe($printing->id);
        expect($result['confidence'])->toBe('high');
    });

    it('finds card by name', function () {
        $card = FabCard::factory()->create(['name' => 'Aether Flare']);
        $printing = FabPrinting::factory()->create(['fab_card_id' => $card->id]);

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
        $card = FabCard::factory()->create(['name' => 'Mystic Warrior']);
        FabPrinting::factory()->create(['fab_card_id' => $card->id]);
        FabPrinting::factory()->create(['fab_card_id' => $card->id]);

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
