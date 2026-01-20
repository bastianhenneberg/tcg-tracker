<?php

use App\Models\DeckZone;
use App\Models\GameFormat;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

describe('DeckZone Model', function () {
    it('can be created via factory', function () {
        $zone = DeckZone::factory()->create();

        expect($zone)->toBeInstanceOf(DeckZone::class)
            ->and($zone->exists)->toBeTrue()
            ->and($zone->name)->toBeString();
    });

    it('has gameFormat relationship', function () {
        $zone = DeckZone::factory()->create();

        expect($zone->gameFormat)->toBeInstanceOf(GameFormat::class);
    });

    it('has deckCards relationship', function () {
        $zone = DeckZone::factory()->create();

        expect($zone->deckCards)->toBeEmpty();
    });

    it('casts min_cards to integer', function () {
        $zone = DeckZone::factory()->create(['min_cards' => 52]);

        expect($zone->min_cards)->toBeInt()
            ->and($zone->min_cards)->toBe(52);
    });

    it('casts max_cards to integer', function () {
        $zone = DeckZone::factory()->create(['max_cards' => 80]);

        expect($zone->max_cards)->toBeInt()
            ->and($zone->max_cards)->toBe(80);
    });

    it('handles null max_cards', function () {
        $zone = DeckZone::factory()->create(['max_cards' => null]);

        expect($zone->max_cards)->toBeNull();
    });

    it('casts is_required to boolean', function () {
        $zoneRequired = DeckZone::factory()->create(['is_required' => true]);
        $zoneOptional = DeckZone::factory()->create(['is_required' => false]);

        expect($zoneRequired->is_required)->toBeBool()
            ->and($zoneRequired->is_required)->toBeTrue()
            ->and($zoneOptional->is_required)->toBeBool()
            ->and($zoneOptional->is_required)->toBeFalse();
    });

    it('casts sort_order to integer', function () {
        $zone = DeckZone::factory()->create(['sort_order' => 5]);

        expect($zone->sort_order)->toBeInt()
            ->and($zone->sort_order)->toBe(5);
    });

    it('can filter with scopeOrdered', function () {
        $format = GameFormat::factory()->create();

        DeckZone::factory()->forFormat($format)->create(['sort_order' => 3]);
        DeckZone::factory()->forFormat($format)->create(['sort_order' => 1]);
        DeckZone::factory()->forFormat($format)->create(['sort_order' => 2]);

        $zones = DeckZone::where('game_format_id', $format->id)->ordered()->get();

        expect($zones->pluck('sort_order')->toArray())->toBe([1, 2, 3]);
    });

    it('can filter with scopeRequired', function () {
        $format = GameFormat::factory()->create();

        DeckZone::factory()->forFormat($format)->create(['is_required' => true]);
        DeckZone::factory()->forFormat($format)->create(['is_required' => true]);
        DeckZone::factory()->forFormat($format)->create(['is_required' => false]);

        expect(DeckZone::where('game_format_id', $format->id)->required()->count())->toBe(2);
    });

    it('creates main zone with factory state', function () {
        $zone = DeckZone::factory()->main()->create();

        expect($zone->slug)->toBe('main')
            ->and($zone->name)->toBe('Main')
            ->and($zone->is_required)->toBeTrue();
    });

    it('creates sideboard zone with factory state', function () {
        $zone = DeckZone::factory()->sideboard()->create();

        expect($zone->slug)->toBe('sideboard')
            ->and($zone->name)->toBe('Sideboard')
            ->and($zone->is_required)->toBeFalse();
    });
});
