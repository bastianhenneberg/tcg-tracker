<?php

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckZone;
use App\Models\PlaysetRule;
use App\Models\UnifiedCard;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\User;
use App\Services\DeckValidationService;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

describe('DeckValidationService', function () {
    describe('zone limits', function () {
        it('detects zone minimum violation', function () {
            $deck = Deck::factory()->create(['user_id' => $this->user->id]);

            // Create a required zone with minimum of 52 cards
            $zone = DeckZone::factory()
                ->forFormat($deck->gameFormat)
                ->create([
                    'slug' => 'main-deck',
                    'name' => 'Main Deck',
                    'min_cards' => 52,
                    'max_cards' => 80,
                    'is_required' => true,
                ]);

            // Add only 10 cards to the deck
            $card = UnifiedCard::factory()->forGame('fab')->create();
            $printing = UnifiedPrinting::factory()->forCard($card)->create();

            DeckCard::factory()
                ->forDeck($deck)
                ->forZone($zone)
                ->forPrinting($printing)
                ->create(['quantity' => 10]);

            $service = app(DeckValidationService::class);
            $result = $service->validateDeck($deck);

            expect($result['valid'])->toBeFalse()
                ->and(collect($result['errors'])->pluck('type'))->toContain('zone_minimum');
        });

        it('detects zone maximum violation', function () {
            $deck = Deck::factory()->create(['user_id' => $this->user->id]);

            // Create a zone with maximum of 10 cards
            $zone = DeckZone::factory()
                ->forFormat($deck->gameFormat)
                ->create([
                    'slug' => 'sideboard',
                    'name' => 'Sideboard',
                    'min_cards' => 0,
                    'max_cards' => 10,
                    'is_required' => false,
                ]);

            // Add 15 cards (exceeding max)
            $card = UnifiedCard::factory()->forGame('fab')->create();
            $printing = UnifiedPrinting::factory()->forCard($card)->create();

            DeckCard::factory()
                ->forDeck($deck)
                ->forZone($zone)
                ->forPrinting($printing)
                ->create(['quantity' => 15]);

            $service = app(DeckValidationService::class);
            $result = $service->checkZoneLimits($deck);

            expect(collect($result)->pluck('type'))->toContain('zone_maximum');
        });

        it('passes when zone limits are met', function () {
            $deck = Deck::factory()->create(['user_id' => $this->user->id]);

            // Create a zone with min 10, max 20
            $zone = DeckZone::factory()
                ->forFormat($deck->gameFormat)
                ->create([
                    'slug' => 'test-zone',
                    'name' => 'Test Zone',
                    'min_cards' => 10,
                    'max_cards' => 20,
                    'is_required' => true,
                ]);

            // Add exactly 15 cards (within limits)
            $card = UnifiedCard::factory()->forGame('fab')->create();
            $printing = UnifiedPrinting::factory()->forCard($card)->create();

            DeckCard::factory()
                ->forDeck($deck)
                ->forZone($zone)
                ->forPrinting($printing)
                ->create(['quantity' => 15]);

            $service = app(DeckValidationService::class);
            $result = $service->checkZoneLimits($deck);

            expect($result)->toBeEmpty();
        });
    });

    describe('playset limits', function () {
        it('detects playset limit violation', function () {
            $deck = Deck::factory()->create(['user_id' => $this->user->id]);

            // Create playset rule: max 3 copies
            PlaysetRule::create([
                'user_id' => $this->user->id,
                'game_format_id' => $deck->game_format_id,
                'name' => 'Default',
                'max_copies' => 3,
                'priority' => 0,
                'conditions' => [],
            ]);

            $zone = DeckZone::factory()
                ->forFormat($deck->gameFormat)
                ->create(['is_required' => false]);

            // Add 5 copies of the same card (exceeding limit of 3)
            $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
            $printing = UnifiedPrinting::factory()->forCard($card)->create();

            DeckCard::factory()
                ->forDeck($deck)
                ->forZone($zone)
                ->forPrinting($printing)
                ->create(['quantity' => 5]);

            $service = app(DeckValidationService::class);
            $result = $service->validateDeck($deck);

            expect($result['valid'])->toBeFalse()
                ->and(collect($result['errors'])->pluck('type'))->toContain('playset_exceeded')
                ->and(collect($result['errors'])->firstWhere('type', 'playset_exceeded')['count'])->toBe(5)
                ->and(collect($result['errors'])->firstWhere('type', 'playset_exceeded')['max'])->toBe(3);
        });

        it('passes when playset limits are met', function () {
            $deck = Deck::factory()->create(['user_id' => $this->user->id]);

            // Create playset rule: max 3 copies
            PlaysetRule::create([
                'user_id' => $this->user->id,
                'game_format_id' => $deck->game_format_id,
                'name' => 'Default',
                'max_copies' => 3,
                'priority' => 0,
                'conditions' => [],
            ]);

            $zone = DeckZone::factory()
                ->forFormat($deck->gameFormat)
                ->create(['is_required' => false]);

            // Add exactly 3 copies
            $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
            $printing = UnifiedPrinting::factory()->forCard($card)->create();

            DeckCard::factory()
                ->forDeck($deck)
                ->forZone($zone)
                ->forPrinting($printing)
                ->create(['quantity' => 3]);

            $service = app(DeckValidationService::class);
            $result = $service->validateDeck($deck);

            // Should not have playset errors
            expect(collect($result['errors'])->pluck('type'))->not->toContain('playset_exceeded');
        });

        it('uses default max copies when no rules exist', function () {
            $deck = Deck::factory()->create(['user_id' => $this->user->id]);

            // No playset rules - should use default of 3

            $zone = DeckZone::factory()
                ->forFormat($deck->gameFormat)
                ->create(['is_required' => false]);

            // Add 4 copies (exceeding default of 3)
            $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
            $printing = UnifiedPrinting::factory()->forCard($card)->create();

            DeckCard::factory()
                ->forDeck($deck)
                ->forZone($zone)
                ->forPrinting($printing)
                ->create(['quantity' => 4]);

            $service = app(DeckValidationService::class);
            $result = $service->validateDeck($deck);

            expect(collect($result['errors'])->pluck('type'))->toContain('playset_exceeded');
        });
    });

    describe('collection availability', function () {
        it('detects collection shortage when use_collection_only is enabled', function () {
            $deck = Deck::factory()->collectionOnly()->create(['user_id' => $this->user->id]);

            $zone = DeckZone::factory()
                ->forFormat($deck->gameFormat)
                ->create(['is_required' => false]);

            // Create a card and add 3 to deck
            $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
            $printing = UnifiedPrinting::factory()->forCard($card)->create();

            DeckCard::factory()
                ->forDeck($deck)
                ->forZone($zone)
                ->forPrinting($printing)
                ->create(['quantity' => 3]);

            // Only add 1 copy to collection
            UnifiedInventory::factory()->create([
                'user_id' => $this->user->id,
                'printing_id' => $printing->id,
                'quantity' => 1,
                'in_collection' => true,
            ]);

            $service = app(DeckValidationService::class);
            $result = $service->checkCollectionAvailability($deck);

            expect(collect($result)->pluck('type'))->toContain('collection_shortage')
                ->and(collect($result)->firstWhere('type', 'collection_shortage')['needed'])->toBe(3)
                ->and(collect($result)->firstWhere('type', 'collection_shortage')['owned'])->toBe(1);
        });

        it('passes when collection has enough copies', function () {
            $deck = Deck::factory()->collectionOnly()->create(['user_id' => $this->user->id]);

            $zone = DeckZone::factory()
                ->forFormat($deck->gameFormat)
                ->create(['is_required' => false]);

            // Create a card and add 2 to deck
            $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
            $printing = UnifiedPrinting::factory()->forCard($card)->create();

            DeckCard::factory()
                ->forDeck($deck)
                ->forZone($zone)
                ->forPrinting($printing)
                ->create(['quantity' => 2]);

            // Add 3 copies to collection (more than needed)
            UnifiedInventory::factory()->create([
                'user_id' => $this->user->id,
                'printing_id' => $printing->id,
                'quantity' => 3,
                'in_collection' => true,
            ]);

            $service = app(DeckValidationService::class);
            $result = $service->checkCollectionAvailability($deck);

            expect($result)->toBeEmpty();
        });

        it('does not check collection when use_collection_only is disabled', function () {
            $deck = Deck::factory()->create([
                'user_id' => $this->user->id,
                'use_collection_only' => false,
            ]);

            $zone = DeckZone::factory()
                ->forFormat($deck->gameFormat)
                ->create(['is_required' => false]);

            // Create a card and add 3 to deck
            $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
            $printing = UnifiedPrinting::factory()->forCard($card)->create();

            DeckCard::factory()
                ->forDeck($deck)
                ->forZone($zone)
                ->forPrinting($printing)
                ->create(['quantity' => 3]);

            // No cards in collection

            $service = app(DeckValidationService::class);
            $result = $service->validateDeck($deck);

            // Should not have collection errors
            expect(collect($result['errors'])->pluck('type'))->not->toContain('collection_shortage');
        });
    });

    describe('valid deck', function () {
        it('returns valid true when all checks pass', function () {
            $deck = Deck::factory()->create(['user_id' => $this->user->id]);

            // Create playset rule
            PlaysetRule::create([
                'user_id' => $this->user->id,
                'game_format_id' => $deck->game_format_id,
                'name' => 'Default',
                'max_copies' => 3,
                'priority' => 0,
                'conditions' => [],
            ]);

            // Don't create any zones - empty deck should be valid with no required zones
            // (The factory-created format won't have pre-existing zones)

            $service = app(DeckValidationService::class);
            $result = $service->validateDeck($deck);

            expect($result['valid'])->toBeTrue()
                ->and($result['errors'])->toBeEmpty();
        });

        it('returns valid true when deck meets all zone and playset requirements', function () {
            // Create a fresh GameFormat to ensure no pre-existing zones
            $format = \App\Models\GameFormat::factory()->create();

            $deck = Deck::factory()->create([
                'user_id' => $this->user->id,
                'game_format_id' => $format->id,
            ]);

            // Create playset rule
            PlaysetRule::create([
                'user_id' => $this->user->id,
                'game_format_id' => $format->id,
                'name' => 'Default',
                'max_copies' => 3,
                'priority' => 0,
                'conditions' => [],
            ]);

            // Create a required zone with min cards
            $zone = DeckZone::factory()
                ->forFormat($format)
                ->create([
                    'name' => 'Main',
                    'min_cards' => 3,
                    'max_cards' => 10,
                    'is_required' => true,
                ]);

            // Add exactly 3 cards (meeting min requirement)
            $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
            $printing = UnifiedPrinting::factory()->forCard($card)->create();

            DeckCard::factory()
                ->forDeck($deck)
                ->forZone($zone)
                ->forPrinting($printing)
                ->create(['quantity' => 3]);

            $service = app(DeckValidationService::class);
            $result = $service->validateDeck($deck);

            expect($result['valid'])->toBeTrue()
                ->and($result['errors'])->toBeEmpty();
        });
    });
});
