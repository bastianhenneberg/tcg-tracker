<?php

use App\Models\UnifiedCard;
use App\Services\CardImport\OpCardImportMapper;
use App\Services\CardImport\RiftboundCardImportMapper;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('maps the raw Riftbound community feed format', function () {
    $raw = [
        'id' => 'ogs-001-024',
        'name' => 'Annie, Fiery',
        'collectorNumber' => 1,
        'publicCode' => 'OGS-001/024',
        'set' => 'OGS',
        'setName' => 'Proving Grounds',
        'domains' => [['id' => 'fury', 'label' => 'Fury']],
        'rarity' => ['id' => 'epic', 'label' => 'Epic'],
        'cardType' => [['id' => 'unit', 'label' => 'Unit']],
        'cardImage' => ['url' => 'https://example.com/annie.png'],
        'illustrator' => ['Polar Engine Studio'],
        'text' => '<p>Your spells deal 1 Bonus Damage. <em>(Increased by 1.)</em></p>',
        'energy' => 5,
        'power' => 1,
    ];

    $mapper = new RiftboundCardImportMapper;
    $card = $mapper->mapCard($raw);

    expect($card['name'])->toBe('Annie, Fiery')
        ->and($card['types'])->toBe(['Unit'])
        ->and($card['colors'])->toBe(['Fury'])
        ->and($card['text'])->toBe('Your spells deal 1 Bonus Damage. (Increased by 1.)')
        ->and($card['text'])->not->toContain('<')
        ->and($card['cost'])->toBe('5')
        ->and($card['game_specific']['illustrators'])->toBe(['Polar Engine Studio'])
        ->and($card['external_ids']['riftbound_id'])->toBe('ogs-001-024');

    $unifiedCard = UnifiedCard::factory()->forGame('riftbound')->create();
    $printing = $mapper->mapPrinting($raw, $unifiedCard);

    expect($printing['set_code'])->toBe('OGS')
        ->and($printing['set_name'])->toBe('Proving Grounds')
        ->and($printing['collector_number'])->toBe('1')
        ->and($printing['rarity'])->toBe('E')
        ->and($printing['rarity_label'])->toBe('Epic')
        ->and($printing['image_url'])->toBe('https://example.com/annie.png')
        ->and($printing['artist'])->toBe('Polar Engine Studio');
});

it('maps the raw One Piece optcgapi feed format', function () {
    $raw = [
        'card_name' => 'Perona',
        'set_name' => 'Romance Dawn',
        'card_text' => '[On Play] Look at 5 cards.',
        'set_id' => 'OP-01',
        'rarity' => 'UC',
        'card_set_id' => 'OP01-077',
        'card_color' => 'Blue',
        'card_type' => 'Character',
        'life' => null,
        'card_cost' => '1',
        'card_power' => '2000',
        'sub_types' => 'Thriller Bark Pirates',
        'counter_amount' => 1000,
        'attribute' => 'Special',
        'card_image' => 'https://example.com/op01-077.jpg',
    ];

    $mapper = new OpCardImportMapper;
    $card = $mapper->mapCard($raw);

    expect($mapper->isValidCard($raw))->toBeTrue();

    expect($card['name'])->toBe('Perona')
        ->and($card['text'])->toBe('[On Play] Look at 5 cards.')
        ->and($card['cost'])->toBe('1')
        ->and($card['power'])->toBe('2000')
        ->and($card['types'])->toBe(['Character'])
        ->and($card['subtypes'])->toBe(['Thriller Bark Pirates'])
        ->and($card['colors'])->toBe(['Blue'])
        ->and($card['game_specific']['counter'])->toBe(1000)
        ->and($card['external_ids']['op_id'])->toBe('OP01-077');

    $unifiedCard = UnifiedCard::factory()->forGame('onepiece')->create();
    $printing = $mapper->mapPrinting($raw, $unifiedCard);

    expect($printing['set_code'])->toBe('OP-01')
        ->and($printing['collector_number'])->toBe('077')
        ->and($printing['rarity'])->toBe('UC')
        ->and($printing['image_url'])->toBe('https://example.com/op01-077.jpg')
        ->and($printing['external_ids']['op_printing_id'])->toBe('OP01-077');
});

it('still maps dual colors for One Piece', function () {
    $mapper = new OpCardImportMapper;
    $card = $mapper->mapCard([
        'card_name' => 'Dual Leader',
        'card_color' => 'Black/Yellow',
        'card_type' => 'Leader',
    ]);

    expect($card['colors'])->toBe(['Black', 'Yellow'])
        ->and($card['game_specific']['color'])->toBe('Black')
        ->and($card['game_specific']['color_secondary'])->toBe('Yellow');
});
