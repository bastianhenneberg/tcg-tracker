<?php

use App\Models\Box;
use App\Models\Fab\FabCard;
use App\Models\Fab\FabCollection;
use App\Models\Fab\FabInventory;
use App\Models\Fab\FabPrinting;
use App\Models\Fab\FabSet;
use App\Models\Lot;
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

    it('has many fab inventory items', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);
        $lot = Lot::factory()->create(['user_id' => $user->id, 'box_id' => $box->id]);

        FabInventory::factory()->count(5)->create([
            'user_id' => $user->id,
            'lot_id' => $lot->id,
        ]);

        expect($lot->fabInventory)->toHaveCount(5);
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

describe('FabInventory', function () {
    it('belongs to a user', function () {
        $item = FabInventory::factory()->create();

        expect($item->user)->toBeInstanceOf(User::class);
    });

    it('belongs to a lot', function () {
        $item = FabInventory::factory()->create();

        expect($item->lot)->toBeInstanceOf(Lot::class);
    });

    it('belongs to a fab printing', function () {
        $item = FabInventory::factory()->create();

        expect($item->printing)->toBeInstanceOf(FabPrinting::class);
    });

    it('tracks sold status', function () {
        $available = FabInventory::factory()->create();
        $sold = FabInventory::factory()->sold()->create();

        expect($available->isSold())->toBeFalse()
            ->and($available->isAvailable())->toBeTrue()
            ->and($sold->isSold())->toBeTrue()
            ->and($sold->isAvailable())->toBeFalse();
    });

    it('has condition constants', function () {
        expect(FabInventory::CONDITIONS)->toHaveKeys(['NM', 'LP', 'MP', 'HP', 'DMG']);
    });

    it('has language constants', function () {
        expect(FabInventory::LANGUAGES)->toHaveKeys(['EN', 'DE', 'FR', 'ES', 'IT', 'JP', 'CN', 'KR']);
    });

    it('renumbers positions when item deleted', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);
        $lot = Lot::factory()->create(['user_id' => $user->id, 'box_id' => $box->id]);

        $item1 = FabInventory::factory()->create([
            'user_id' => $user->id,
            'lot_id' => $lot->id,
            'position_in_lot' => 1,
        ]);
        $item2 = FabInventory::factory()->create([
            'user_id' => $user->id,
            'lot_id' => $lot->id,
            'position_in_lot' => 2,
        ]);
        $item3 = FabInventory::factory()->create([
            'user_id' => $user->id,
            'lot_id' => $lot->id,
            'position_in_lot' => 3,
        ]);

        // Delete item in the middle
        $item2->delete();
        FabInventory::renumberPositionsInLot($lot->id);

        $item1->refresh();
        $item3->refresh();

        expect($item1->position_in_lot)->toBe(1)
            ->and($item3->position_in_lot)->toBe(2);
    });
});

describe('FabCollection', function () {
    it('belongs to a user', function () {
        $item = FabCollection::factory()->create();

        expect($item->user)->toBeInstanceOf(User::class);
    });

    it('belongs to a fab printing', function () {
        $item = FabCollection::factory()->create();

        expect($item->printing)->toBeInstanceOf(FabPrinting::class);
    });

    it('can have a source lot', function () {
        $user = User::factory()->create();
        $box = Box::factory()->create(['user_id' => $user->id]);
        $lot = Lot::factory()->create(['user_id' => $user->id, 'box_id' => $box->id]);
        $printing = FabPrinting::factory()->create();

        $item = FabCollection::factory()->create([
            'user_id' => $user->id,
            'fab_printing_id' => $printing->id,
            'source_lot_id' => $lot->id,
        ]);

        expect($item->sourceLot)->toBeInstanceOf(Lot::class)
            ->and($item->source_lot_id)->toBe($lot->id);
    });

    it('has default quantity of 1', function () {
        $item = FabCollection::factory()->create(['quantity' => 1]);

        expect($item->quantity)->toBe(1);
    });
});

describe('FabPrinting', function () {
    it('belongs to a fab card', function () {
        $printing = FabPrinting::factory()->create();

        expect($printing->card)->toBeInstanceOf(FabCard::class);
    });

    it('belongs to a fab set', function () {
        $printing = FabPrinting::factory()->create();

        expect($printing->set)->toBeInstanceOf(FabSet::class);
    });

    it('has rarity constants', function () {
        expect(FabPrinting::RARITIES)->toHaveKeys(['C', 'R', 'S', 'M', 'L', 'F', 'P', 'T']);
    });

    it('has foiling constants', function () {
        expect(FabPrinting::FOILINGS)->toHaveKeys(['S', 'R', 'C', 'G']);
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

    it('has many fab inventory items', function () {
        $user = User::factory()->create();
        FabInventory::factory()->count(4)->create(['user_id' => $user->id]);

        expect($user->fabInventory)->toHaveCount(4);
    });

    it('has many fab collection items', function () {
        $user = User::factory()->create();
        FabCollection::factory()->count(5)->create(['user_id' => $user->id]);

        expect($user->fabCollection)->toHaveCount(5);
    });
});
