<?php

use App\Models\Box;
use App\Models\Lot;
use App\Models\UnifiedCard;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

describe('Box', function () {
    it('belongs to a user', function () {
        $box = Box::factory()->create();

        expect($box->user)->toBeInstanceOf(User::class);
    });

    it('has many lots', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);
        Lot::factory()->count(3)->create([
            'user_id' => $user->id,
            'box_id' => $box->id,
        ]);

        expect($box->lots)->toHaveCount(3);
    });
});

describe('Lot', function () {
    it('belongs to a user', function () {
        $lot = Lot::factory()->create();

        expect($lot->user)->toBeInstanceOf(User::class);
    });

    it('belongs to a box', function () {
        $lot = Lot::factory()->create();

        expect($lot->box)->toBeInstanceOf(Box::class);
    });

    it('has many inventory items', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);
        $lot = Lot::factory()->create(['user_id' => $user->id, 'box_id' => $box->id]);
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();

        UnifiedInventory::factory()->count(5)->create([
            'user_id' => $user->id,
            'lot_id' => $lot->id,
            'printing_id' => $printing->id,
        ]);

        expect($lot->inventoryItems)->toHaveCount(5);
    });

    it('generates next lot number for user', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);

        expect(Lot::nextLotNumber($user->id))->toBe(1);

        Lot::factory()->create([
            'user_id' => $user->id,
            'box_id' => $box->id,
            'lot_number' => 5,
        ]);

        expect(Lot::nextLotNumber($user->id))->toBe(6);
    });
});

describe('UnifiedInventory', function () {
    it('belongs to a user', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();
        $item = UnifiedInventory::factory()->create(['printing_id' => $printing->id]);

        expect($item->user)->toBeInstanceOf(User::class);
    });

    it('belongs to a lot', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);
        $lot = Lot::factory()->create(['user_id' => $user->id, 'box_id' => $box->id]);
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();

        $item = UnifiedInventory::factory()->create([
            'user_id' => $user->id,
            'lot_id' => $lot->id,
            'printing_id' => $printing->id,
        ]);

        expect($item->lot)->toBeInstanceOf(Lot::class);
    });

    it('belongs to a printing', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();
        $item = UnifiedInventory::factory()->create(['printing_id' => $printing->id]);

        expect($item->printing)->toBeInstanceOf(UnifiedPrinting::class);
    });

    it('can filter by collection status', function () {
        $user = User::factory()->create();
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();

        UnifiedInventory::factory()->count(3)->create([
            'user_id' => $user->id,
            'printing_id' => $printing->id,
            'in_collection' => false,
        ]);

        UnifiedInventory::factory()->count(2)->create([
            'user_id' => $user->id,
            'printing_id' => $printing->id,
            'in_collection' => true,
        ]);

        expect(UnifiedInventory::inInventory()->count())->toBe(3)
            ->and(UnifiedInventory::inCollection()->count())->toBe(2);
    });

    it('has condition constants', function () {
        expect(UnifiedInventory::CONDITIONS)->toHaveKeys(['NM', 'LP', 'MP', 'HP', 'DMG']);
    });

    it('has language constants', function () {
        expect(UnifiedInventory::LANGUAGES)->toHaveKeys(['EN', 'DE', 'FR', 'ES', 'IT', 'JA', 'KO', 'ZH']);
    });
});

describe('UnifiedPrinting', function () {
    it('belongs to a card', function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();

        expect($printing->card)->toBeInstanceOf(UnifiedCard::class);
    });

    it('has finishes constants', function () {
        expect(UnifiedPrinting::FINISHES)->toHaveKeys(['nonfoil', 'foil', 'cold_foil', 'rainbow_foil']);
    });

    it('has game-specific finishes', function () {
        expect(UnifiedPrinting::GAME_FINISHES)->toHaveKeys(['fab', 'mtg', 'riftbound']);
        expect(UnifiedPrinting::GAME_FINISHES['fab'])->toHaveKeys(['S', 'R', 'C', 'G']);
    });
});

describe('User relationships', function () {
    it('has many boxes', function () {
        $user = User::factory()->create();
        Box::factory()->count(2)->create(['user_id' => $user->id]);

        expect($user->boxes)->toHaveCount(2);
    });

    it('has many lots', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);
        Lot::factory()->count(3)->create(['user_id' => $user->id, 'box_id' => $box->id]);

        expect($user->lots)->toHaveCount(3);
    });

    it('has many unified inventory items', function () {
        $user = User::factory()->create();
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();

        UnifiedInventory::factory()->count(4)->create([
            'user_id' => $user->id,
            'printing_id' => $printing->id,
            'in_collection' => false,
        ]);

        expect($user->unifiedInventory)->toHaveCount(4);
    });

    it('separates inventory from collection', function () {
        $user = User::factory()->create();
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create();

        UnifiedInventory::factory()->count(3)->create([
            'user_id' => $user->id,
            'printing_id' => $printing->id,
            'in_collection' => false,
        ]);

        UnifiedInventory::factory()->count(2)->create([
            'user_id' => $user->id,
            'printing_id' => $printing->id,
            'in_collection' => true,
        ]);

        expect($user->inventory)->toHaveCount(3);
        expect($user->collection)->toHaveCount(2);
    });
});
