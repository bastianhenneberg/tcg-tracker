<?php

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckZone;
use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use App\Models\User;
use App\Services\DeckbuilderService;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->deck = Deck::factory()->create(['user_id' => $this->user->id]);

    // Create zones for the deck's format
    $this->mainZone = DeckZone::factory()
        ->forFormat($this->deck->gameFormat)
        ->create(['slug' => 'main', 'name' => 'Main']);

    $this->sideboardZone = DeckZone::factory()
        ->forFormat($this->deck->gameFormat)
        ->create(['slug' => 'sideboard', 'name' => 'Sideboard']);

    // Create card and printing for tests
    $this->card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
    $this->printing = UnifiedPrinting::factory()->forCard($this->card)->create();

    $this->service = app(DeckbuilderService::class);
});

describe('DeckbuilderService', function () {
    describe('addCard', function () {
        it('adds a card to the deck', function () {
            $deckCard = $this->service->addCard($this->deck, $this->printing, 'main', 2);

            expect($deckCard)->toBeInstanceOf(DeckCard::class)
                ->and($deckCard->deck_id)->toBe($this->deck->id)
                ->and($deckCard->printing_id)->toBe($this->printing->id)
                ->and($deckCard->quantity)->toBe(2);

            $this->assertDatabaseHas('deck_cards', [
                'deck_id' => $this->deck->id,
                'printing_id' => $this->printing->id,
                'quantity' => 2,
            ]);
        });

        it('increments quantity when adding same card again', function () {
            $this->service->addCard($this->deck, $this->printing, 'main', 2);
            $deckCard = $this->service->addCard($this->deck, $this->printing, 'main', 1);

            expect($deckCard->quantity)->toBe(3);

            // Should only have one record
            expect(DeckCard::where('deck_id', $this->deck->id)->count())->toBe(1);
        });

        it('assigns correct position to new cards', function () {
            $card2 = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card 2']);
            $printing2 = UnifiedPrinting::factory()->forCard($card2)->create();

            $deckCard1 = $this->service->addCard($this->deck, $this->printing, 'main');
            $deckCard2 = $this->service->addCard($this->deck, $printing2, 'main');

            expect($deckCard1->position)->toBe(0)
                ->and($deckCard2->position)->toBe(1);
        });
    });

    describe('removeCard', function () {
        it('removes a card from the deck', function () {
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create();

            $this->service->removeCard($this->deck, $deckCard->id);

            $this->assertDatabaseMissing('deck_cards', ['id' => $deckCard->id]);
        });

        it('does not remove cards from other decks', function () {
            $otherDeck = Deck::factory()->create();
            $otherZone = DeckZone::factory()->forFormat($otherDeck->gameFormat)->create();
            $otherCard = UnifiedCard::factory()->forGame('fab')->create();
            $otherPrinting = UnifiedPrinting::factory()->forCard($otherCard)->create();

            $deckCard = DeckCard::factory()
                ->forDeck($otherDeck)
                ->forZone($otherZone)
                ->forPrinting($otherPrinting)
                ->create();

            $this->service->removeCard($this->deck, $deckCard->id);

            // Card should still exist because it belongs to different deck
            $this->assertDatabaseHas('deck_cards', ['id' => $deckCard->id]);
        });
    });

    describe('moveCard', function () {
        it('moves a card between zones', function () {
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 2]);

            $movedCard = $this->service->moveCard($this->deck, $deckCard->id, 'sideboard');

            expect($movedCard->deck_zone_id)->toBe($this->sideboardZone->id)
                ->and($movedCard->quantity)->toBe(2);
        });

        it('merges quantities when moving to zone with same card', function () {
            // Add 2 copies to main
            $mainCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 2]);

            // Add 1 copy to sideboard
            DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->sideboardZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 1]);

            // Move main card to sideboard
            $movedCard = $this->service->moveCard($this->deck, $mainCard->id, 'sideboard');

            // Should have merged quantities (2 + 1 = 3)
            expect($movedCard->quantity)->toBe(3);

            // Old card should be deleted
            $this->assertDatabaseMissing('deck_cards', ['id' => $mainCard->id]);

            // Only one card entry in sideboard
            expect(DeckCard::where('deck_id', $this->deck->id)
                ->where('deck_zone_id', $this->sideboardZone->id)
                ->count())->toBe(1);
        });
    });

    describe('updateQuantity', function () {
        it('updates the quantity of a card', function () {
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 2]);

            $updatedCard = $this->service->updateQuantity($this->deck, $deckCard->id, 4);

            expect($updatedCard->quantity)->toBe(4);
        });

        it('deletes card when quantity is set to zero', function () {
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 2]);

            $this->service->updateQuantity($this->deck, $deckCard->id, 0);

            $this->assertDatabaseMissing('deck_cards', ['id' => $deckCard->id]);
        });

        it('deletes card when quantity is negative', function () {
            $deckCard = DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 2]);

            $this->service->updateQuantity($this->deck, $deckCard->id, -1);

            $this->assertDatabaseMissing('deck_cards', ['id' => $deckCard->id]);
        });
    });

    describe('getStatistics', function () {
        it('returns correct statistics array', function () {
            // Add some cards with different properties
            $card1 = UnifiedCard::factory()->forGame('fab')->create([
                'name' => 'Card 1',
                'game_specific' => ['cost' => 2, 'types' => ['Action', 'Attack']],
            ]);
            $printing1 = UnifiedPrinting::factory()->forCard($card1)->create();

            $card2 = UnifiedCard::factory()->forGame('fab')->create([
                'name' => 'Card 2',
                'game_specific' => ['cost' => 3, 'types' => ['Action']],
            ]);
            $printing2 = UnifiedPrinting::factory()->forCard($card2)->create();

            DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($printing1)
                ->create(['quantity' => 3]);

            DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->sideboardZone)
                ->forPrinting($printing2)
                ->create(['quantity' => 2]);

            $stats = $this->service->getStatistics($this->deck);

            expect($stats)->toHaveKeys(['total_cards', 'mana_curve', 'type_distribution', 'color_distribution', 'zones'])
                ->and($stats['total_cards'])->toBe(5)
                ->and($stats['zones'])->toHaveKey('Main')
                ->and($stats['zones'])->toHaveKey('Sideboard')
                ->and($stats['zones']['Main'])->toBe(3)
                ->and($stats['zones']['Sideboard'])->toBe(2);
        });

        it('calculates mana curve correctly', function () {
            $card1 = UnifiedCard::factory()->forGame('fab')->create([
                'name' => 'Card 1',
                'game_specific' => ['cost' => 1],
            ]);
            $printing1 = UnifiedPrinting::factory()->forCard($card1)->create();

            $card2 = UnifiedCard::factory()->forGame('fab')->create([
                'name' => 'Card 2',
                'game_specific' => ['cost' => 3],
            ]);
            $printing2 = UnifiedPrinting::factory()->forCard($card2)->create();

            DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($printing1)
                ->create(['quantity' => 4]);

            DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($printing2)
                ->create(['quantity' => 2]);

            $stats = $this->service->getStatistics($this->deck);

            expect($stats['mana_curve'][1])->toBe(4)
                ->and($stats['mana_curve'][3])->toBe(2);
        });
    });

    describe('exportAsText', function () {
        it('exports deck as text format', function () {
            DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 3]);

            $text = $this->service->exportAsText($this->deck);

            expect($text)->toContain("// {$this->deck->name}")
                ->and($text)->toContain("// Format: {$this->deck->gameFormat->name}")
                ->and($text)->toContain('// Main')
                ->and($text)->toContain("3x {$this->card->name}");
        });

        it('groups cards by zone', function () {
            $card2 = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Sideboard Card']);
            $printing2 = UnifiedPrinting::factory()->forCard($card2)->create();

            DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->mainZone)
                ->forPrinting($this->printing)
                ->create(['quantity' => 2]);

            DeckCard::factory()
                ->forDeck($this->deck)
                ->forZone($this->sideboardZone)
                ->forPrinting($printing2)
                ->create(['quantity' => 1]);

            $text = $this->service->exportAsText($this->deck);

            expect($text)->toContain('// Main')
                ->and($text)->toContain("2x {$this->card->name}")
                ->and($text)->toContain('// Sideboard')
                ->and($text)->toContain('1x Sideboard Card');
        });
    });
});
