<?php

use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use App\Services\Fab\FabCardMatcherService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->matcher = app(FabCardMatcherService::class);

    // "Brush Off" exists only in set OUT (collector numbers are set-prefixed).
    $brushOff = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Brush Off']);
    $this->brushOffPrinting = UnifiedPrinting::factory()->forCard($brushOff)->create([
        'set_code' => 'OUT',
        'collector_number' => 'OUT228',
        'finish' => 'S',
    ]);

    // A different card whose bare collector number ("224") could be misattributed.
    $other = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Enlightened Strike']);
    UnifiedPrinting::factory()->forCard($other)->create([
        'set_code' => 'WTR',
        'collector_number' => '224',
        'finish' => 'S',
    ]);
});

it('matches a known card by name even when the recognized set code is wrong', function () {
    // Mirrors the real scan: name read correctly, set code misread ("OMN"/"EMK"),
    // collector number not set-prefixed so collector/set strategies miss.
    $result = $this->matcher->findMatch([
        'card_name' => 'Brush Off',
        'set_code' => 'OMN',
        'collector_number' => '224',
    ]);

    expect($result['match'])->not->toBeNull()
        ->and($result['match']->card->name)->toBe('Brush Off');
});

it('does not accept a collector-number-only match whose name disagrees', function () {
    // Bare number "224" maps to "Enlightened Strike", but the recognized name is "Brush Off".
    $result = $this->matcher->findMatch([
        'card_name' => 'Brush Off',
        'collector_number' => '224',
    ]);

    // Must NOT return the wrong card; the correct name match wins instead.
    expect($result['match']->card->name)->toBe('Brush Off');
});

it('still resolves a collector-number-only match when no name was recognized', function () {
    $result = $this->matcher->findMatch([
        'collector_number' => '224',
    ]);

    expect($result['match'])->not->toBeNull()
        ->and($result['match']->card->name)->toBe('Enlightened Strike')
        ->and($result['confidence'])->toBe('high');
});
