<?php

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckZone;
use App\Models\GameFormat;
use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

describe('Deck Model', function () {
    it('can be created via factory', function () {
        $deck = Deck::factory()->create();

        expect($deck)->toBeInstanceOf(Deck::class)
            ->and($deck->exists)->toBeTrue()
            ->and($deck->name)->toBeString();
    });

    it('has user relationship', function () {
        $deck = Deck::factory()->create();

        expect($deck->user)->toBeInstanceOf(User::class);
    });

    it('has gameFormat relationship', function () {
        $deck = Deck::factory()->create();

        expect($deck->gameFormat)->toBeInstanceOf(GameFormat::class);
    });

    it('has cards relationship', function () {
        $deck = Deck::factory()->create();
        $zone = DeckZone::factory()->forFormat($deck->gameFormat)->create();
        $card1 = UnifiedCard::factory()->forGame('fab')->create();
        $card2 = UnifiedCard::factory()->forGame('fab')->create();
        $printing1 = UnifiedPrinting::factory()->forCard($card1)->create();
        $printing2 = UnifiedPrinting::factory()->forCard($card2)->create();

        DeckCard::factory()->forDeck($deck)->forZone($zone)->forPrinting($printing1)->create();
        DeckCard::factory()->forDeck($deck)->forZone($zone)->forPrinting($printing2)->create();

        expect($deck->cards)->toHaveCount(2)
            ->and($deck->cards->first())->toBeInstanceOf(DeckCard::class);
    });

    it('casts is_public to boolean', function () {
        $deckPublic = Deck::factory()->create(['is_public' => true]);
        $deckPrivate = Deck::factory()->create(['is_public' => false]);

        expect($deckPublic->is_public)->toBeBool()
            ->and($deckPublic->is_public)->toBeTrue()
            ->and($deckPrivate->is_public)->toBeBool()
            ->and($deckPrivate->is_public)->toBeFalse();
    });

    it('casts use_collection_only to boolean', function () {
        $deck = Deck::factory()->collectionOnly()->create();

        expect($deck->use_collection_only)->toBeBool()
            ->and($deck->use_collection_only)->toBeTrue();
    });

    it('casts metadata to array', function () {
        $metadata = ['format_version' => 1, 'tags' => ['aggro', 'blitz']];
        $deck = Deck::factory()->create(['metadata' => $metadata]);

        expect($deck->metadata)->toBeArray()
            ->and($deck->metadata)->toBe($metadata)
            ->and($deck->metadata['tags'])->toContain('aggro');
    });

    it('handles null metadata gracefully', function () {
        $deck = Deck::factory()->create(['metadata' => null]);

        expect($deck->metadata)->toBeNull();
    });

    it('calculates card count correctly', function () {
        $deck = Deck::factory()->create();
        $zone = DeckZone::factory()->forFormat($deck->gameFormat)->create();
        $card1 = UnifiedCard::factory()->forGame('fab')->create();
        $card2 = UnifiedCard::factory()->forGame('fab')->create();
        $printing1 = UnifiedPrinting::factory()->forCard($card1)->create();
        $printing2 = UnifiedPrinting::factory()->forCard($card2)->create();

        DeckCard::factory()->forDeck($deck)->forZone($zone)->forPrinting($printing1)->create(['quantity' => 3]);
        DeckCard::factory()->forDeck($deck)->forZone($zone)->forPrinting($printing2)->create(['quantity' => 2]);

        expect($deck->getCardCount())->toBe(5);
    });

    it('returns game via getGame method', function () {
        $deck = Deck::factory()->create();

        expect($deck->getGame())->toBe($deck->gameFormat->game);
    });

    it('filters by user with scopeForUser', function () {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        Deck::factory()->count(3)->create(['user_id' => $user1->id]);
        Deck::factory()->count(2)->create(['user_id' => $user2->id]);

        expect(Deck::forUser($user1->id)->count())->toBe(3)
            ->and(Deck::forUser($user2->id)->count())->toBe(2);
    });

    it('filters public decks with scopePublic', function () {
        Deck::factory()->count(3)->public()->create();
        Deck::factory()->count(2)->create(['is_public' => false]);

        expect(Deck::public()->count())->toBe(3);
    });
});
