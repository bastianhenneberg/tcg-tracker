<?php

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckZone;
use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

describe('DeckCard Model', function () {
    it('can be created via factory', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();
        $deckCard = DeckCard::factory()->forPrinting($printing)->create();

        expect($deckCard)->toBeInstanceOf(DeckCard::class)
            ->and($deckCard->exists)->toBeTrue();
    });

    it('has deck relationship', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();
        $deckCard = DeckCard::factory()->forPrinting($printing)->create();

        expect($deckCard->deck)->toBeInstanceOf(Deck::class);
    });

    it('has zone relationship', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();
        $deckCard = DeckCard::factory()->forPrinting($printing)->create();

        expect($deckCard->zone)->toBeInstanceOf(DeckZone::class);
    });

    it('has printing relationship to UnifiedPrinting', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();
        $deckCard = DeckCard::factory()->forPrinting($printing)->create();

        expect($deckCard->printing)->toBeInstanceOf(UnifiedPrinting::class)
            ->and($deckCard->printing->id)->toBe($printing->id);
    });

    it('casts quantity to integer', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();
        $deckCard = DeckCard::factory()->forPrinting($printing)->create(['quantity' => 3]);

        expect($deckCard->quantity)->toBeInt()
            ->and($deckCard->quantity)->toBe(3);
    });

    it('casts position to integer', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();
        $deckCard = DeckCard::factory()->forPrinting($printing)->create(['position' => 5]);

        expect($deckCard->position)->toBeInt()
            ->and($deckCard->position)->toBe(5);
    });

    it('can filter by zone slug with scopeInZone', function () {
        $deck = Deck::factory()->create();
        $mainZone = DeckZone::factory()->forFormat($deck->gameFormat)->create(['slug' => 'main']);
        $sideZone = DeckZone::factory()->forFormat($deck->gameFormat)->create(['slug' => 'sideboard']);

        $card1 = UnifiedCard::factory()->forGame('fab')->create();
        $card2 = UnifiedCard::factory()->forGame('fab')->create();
        $card3 = UnifiedCard::factory()->forGame('fab')->create();
        $printing1 = UnifiedPrinting::factory()->forCard($card1)->create();
        $printing2 = UnifiedPrinting::factory()->forCard($card2)->create();
        $printing3 = UnifiedPrinting::factory()->forCard($card3)->create();

        DeckCard::factory()->forDeck($deck)->forZone($mainZone)->forPrinting($printing1)->create();
        DeckCard::factory()->forDeck($deck)->forZone($mainZone)->forPrinting($printing2)->create();
        DeckCard::factory()->forDeck($deck)->forZone($sideZone)->forPrinting($printing3)->create();

        expect(DeckCard::where('deck_id', $deck->id)->inZone('main')->count())->toBe(2)
            ->and(DeckCard::where('deck_id', $deck->id)->inZone('sideboard')->count())->toBe(1);
    });

    it('can order by position with scopeOrdered', function () {
        $deck = Deck::factory()->create();
        $zone = DeckZone::factory()->forFormat($deck->gameFormat)->create();

        $card1 = UnifiedCard::factory()->forGame('fab')->create();
        $card2 = UnifiedCard::factory()->forGame('fab')->create();
        $card3 = UnifiedCard::factory()->forGame('fab')->create();
        $printing1 = UnifiedPrinting::factory()->forCard($card1)->create();
        $printing2 = UnifiedPrinting::factory()->forCard($card2)->create();
        $printing3 = UnifiedPrinting::factory()->forCard($card3)->create();

        DeckCard::factory()->forDeck($deck)->forZone($zone)->forPrinting($printing1)->create(['position' => 3]);
        DeckCard::factory()->forDeck($deck)->forZone($zone)->forPrinting($printing2)->create(['position' => 1]);
        DeckCard::factory()->forDeck($deck)->forZone($zone)->forPrinting($printing3)->create(['position' => 2]);

        $cards = DeckCard::where('deck_id', $deck->id)->ordered()->get();

        expect($cards->pluck('position')->toArray())->toBe([1, 2, 3]);
    });

    it('can access card through printing', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
        $printing = UnifiedPrinting::factory()->forCard($card)->create();
        $deckCard = DeckCard::factory()->forPrinting($printing)->create();

        expect($deckCard->printing->card->name)->toBe('Test Card');
    });
});
