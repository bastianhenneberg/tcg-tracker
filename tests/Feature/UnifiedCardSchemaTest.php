<?php

use App\Models\UnifiedCard;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\UnifiedSet;
use App\Models\User;
use App\Services\CardImport\CardExportService;
use App\Services\CardImport\CardImportService;
use App\Services\CardImport\FabCardImportMapper;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('UnifiedSet Model', function () {
    it('can create a set with game-specific data', function () {
        $set = UnifiedSet::create([
            'game' => 'fab',
            'code' => 'WTR',
            'name' => 'Welcome to Rathe',
            'set_type' => 'expansion',
            'released_at' => '2019-10-11',
            'card_count' => 226,
            'game_specific' => ['edition' => 'Alpha'],
        ]);

        expect($set->game)->toBe('fab')
            ->and($set->code)->toBe('WTR')
            ->and($set->game_specific)->toBe(['edition' => 'Alpha']);
    });

    it('enforces unique game+code constraint', function () {
        UnifiedSet::create([
            'game' => 'fab',
            'code' => 'WTR',
            'name' => 'Welcome to Rathe',
        ]);

        UnifiedSet::create([
            'game' => 'fab',
            'code' => 'WTR',
            'name' => 'Duplicate',
        ]);
    })->throws(\Illuminate\Database\QueryException::class);
});

describe('UnifiedCard Model', function () {
    it('auto-normalizes name on save', function () {
        $card = UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Enlightened Strike',
            'type_line' => 'Ninja Action - Attack',
        ]);

        expect($card->name_normalized)->toBe('enlightened strike');
    });

    it('stores game-specific fields in JSON', function () {
        $card = UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Test Card',
            'type_line' => 'Action',
            'game_specific' => [
                'pitch' => 3,
                'traits' => ['Ninja'],
            ],
        ]);

        expect($card->game_specific['pitch'])->toBe(3)
            ->and($card->game_specific['traits'])->toBe(['Ninja']);
    });

    it('can search by normalized name', function () {
        UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Enlightened Strike',
            'type_line' => 'Action',
        ]);

        UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Lightning Bolt',
            'type_line' => 'Instant',
        ]);

        $results = UnifiedCard::search('enlightened')->get();

        expect($results)->toHaveCount(1)
            ->and($results->first()->name)->toBe('Enlightened Strike');
    });

    it('has printings relationship', function () {
        $card = UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Test Card',
            'type_line' => 'Action',
        ]);

        UnifiedPrinting::create([
            'card_id' => $card->id,
            'set_code' => 'WTR',
            'collector_number' => '001',
        ]);

        expect($card->printings)->toHaveCount(1);
    });
});

describe('UnifiedPrinting Model', function () {
    it('belongs to a card', function () {
        $card = UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Test Card',
            'type_line' => 'Action',
        ]);

        $printing = UnifiedPrinting::create([
            'card_id' => $card->id,
            'set_code' => 'WTR',
            'collector_number' => '001',
            'rarity' => 'M',
            'finish' => 'R',
        ]);

        expect($printing->card->name)->toBe('Test Card');
    });

    it('can optionally belong to a set', function () {
        $set = UnifiedSet::create([
            'game' => 'fab',
            'code' => 'WTR',
            'name' => 'Welcome to Rathe',
        ]);

        $card = UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Test Card',
            'type_line' => 'Action',
        ]);

        $printing = UnifiedPrinting::create([
            'card_id' => $card->id,
            'set_id' => $set->id,
            'set_code' => 'WTR',
            'collector_number' => '001',
        ]);

        expect($printing->set->name)->toBe('Welcome to Rathe');
    });

    it('generates display name', function () {
        $card = UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Enlightened Strike',
            'type_line' => 'Action',
        ]);

        $printing = UnifiedPrinting::create([
            'card_id' => $card->id,
            'set_code' => 'WTR',
            'collector_number' => '093',
            'finish' => 'R',
            'finish_label' => 'Rainbow Foil',
        ]);

        expect($printing->display_name)->toBe('Enlightened Strike (WTR #093) - Rainbow Foil');
    });
});

describe('UnifiedInventory Model', function () {
    it('belongs to user and printing', function () {
        $user = User::factory()->create();

        $card = UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Test Card',
            'type_line' => 'Action',
        ]);

        $printing = UnifiedPrinting::create([
            'card_id' => $card->id,
            'set_code' => 'WTR',
            'collector_number' => '001',
        ]);

        $inventory = UnifiedInventory::create([
            'user_id' => $user->id,
            'printing_id' => $printing->id,
            'quantity' => 4,
            'condition' => 'NM',
        ]);

        expect($inventory->user->id)->toBe($user->id)
            ->and($inventory->printing->id)->toBe($printing->id)
            ->and($inventory->quantity)->toBe(4);
    });

    it('can filter by collection status', function () {
        $user = User::factory()->create();
        $card = UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Test Card',
            'type_line' => 'Action',
        ]);
        $printing = UnifiedPrinting::create([
            'card_id' => $card->id,
            'set_code' => 'WTR',
            'collector_number' => '001',
        ]);

        UnifiedInventory::create([
            'user_id' => $user->id,
            'printing_id' => $printing->id,
            'in_collection' => true,
        ]);

        UnifiedInventory::create([
            'user_id' => $user->id,
            'printing_id' => $printing->id,
            'in_collection' => false,
        ]);

        expect(UnifiedInventory::inCollection()->count())->toBe(1)
            ->and(UnifiedInventory::inInventory()->count())->toBe(1);
    });
});

describe('FabCardImportMapper', function () {
    it('maps card data correctly', function () {
        $mapper = new FabCardImportMapper;

        $externalData = [
            'unique_id' => 'fab-123',
            'name' => 'Enlightened Strike',
            'type_text' => 'Ninja Action - Attack',
            'types' => ['Action'],
            'traits' => ['Attack'],
            'functional_text' => 'Enlightened Strike gains +2 for each card.',
            'cost' => '2',
            'power' => '4',
            'defense' => '3',
            'pitch' => 3,
            'card_keywords' => ['Go again'],
            'blitz_legal' => true,
            'cc_legal' => true,
        ];

        $mapped = $mapper->mapCard($externalData);

        expect($mapped['game'])->toBe('fab')
            ->and($mapped['name'])->toBe('Enlightened Strike')
            ->and($mapped['types'])->toBe(['Action'])
            ->and($mapped['game_specific']['pitch'])->toBe(3)
            ->and($mapped['legalities']['blitz'])->toBe('legal')
            ->and($mapped['legalities']['cc'])->toBe('legal');
    });

    it('maps printing data correctly', function () {
        $mapper = new FabCardImportMapper;
        $card = UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Test Card',
            'type_line' => 'Action',
        ]);

        $externalData = [
            'unique_id' => 'print-123',
            'set_id' => 'WTR',
            'collector_number' => '093',
            'rarity' => 'M',
            'foiling' => 'R',
            'language' => 'EN',
            'artists' => ['Artist Name'],
        ];

        $mapped = $mapper->mapPrinting($externalData, $card);

        expect($mapped['set_code'])->toBe('WTR')
            ->and($mapped['rarity'])->toBe('M')
            ->and($mapped['rarity_label'])->toBe('Majestic')
            ->and($mapped['finish'])->toBe('R')
            ->and($mapped['finish_label'])->toBe('Rainbow Foil');
    });
});

describe('CardImportService', function () {
    it('imports cards from array', function () {
        $service = new CardImportService;

        $cardsData = [
            [
                'unique_id' => 'card-1',
                'name' => 'Test Card 1',
                'type_text' => 'Action',
                'types' => ['Action'],
                'set_id' => 'WTR',
                'collector_number' => '001',
                'rarity' => 'C',
            ],
            [
                'unique_id' => 'card-2',
                'name' => 'Test Card 2',
                'type_text' => 'Action',
                'types' => ['Action'],
                'set_id' => 'WTR',
                'collector_number' => '002',
                'rarity' => 'R',
            ],
        ];

        $stats = $service->importCards('fab', $cardsData);

        expect($stats['cards'])->toBe(2)
            ->and($stats['printings'])->toBe(2)
            ->and(UnifiedCard::count())->toBe(2)
            ->and(UnifiedPrinting::count())->toBe(2);
    });

    it('updates existing cards on reimport', function () {
        $service = new CardImportService;

        $cardsData = [
            [
                'unique_id' => 'card-1',
                'name' => 'Original Name',
                'type_text' => 'Action',
                'types' => ['Action'],
                'set_id' => 'WTR',
                'collector_number' => '001',
            ],
        ];

        $service->importCards('fab', $cardsData);

        $cardsData[0]['name'] = 'Updated Name';
        $service->importCards('fab', $cardsData);

        expect(UnifiedCard::count())->toBe(1)
            ->and(UnifiedCard::first()->name)->toBe('Updated Name');
    });
});

describe('CardExportService', function () {
    it('exports cards to game-specific format', function () {
        $card = UnifiedCard::create([
            'game' => 'fab',
            'name' => 'Test Card',
            'type_line' => 'Action',
            'types' => ['Action'],
            'game_specific' => ['pitch' => 3],
            'legalities' => ['blitz' => 'legal'],
            'external_ids' => ['fab_id' => 'test-123'],
        ]);

        UnifiedPrinting::create([
            'card_id' => $card->id,
            'set_code' => 'WTR',
            'collector_number' => '001',
            'rarity' => 'M',
            'finish' => 'S',
            'external_ids' => ['fab_printing_id' => 'print-123'],
        ]);

        $service = new CardExportService;
        $data = $service->exportGame('fab');

        expect($data['cards'])->toHaveCount(1)
            ->and($data['cards'][0]['name'])->toBe('Test Card')
            ->and($data['cards'][0]['pitch'])->toBe(3)
            ->and($data['cards'][0]['blitz_legal'])->toBeTrue()
            ->and($data['cards'][0]['printings'])->toHaveCount(1);
    });
});

describe('Import/Export Commands', function () {
    it('validates game argument', function () {
        $this->artisan('cards:import', [
            'game' => 'invalid',
            'file' => '/tmp/test.json',
        ])
            ->assertFailed()
            ->expectsOutput('No import mapper found for game: invalid');
    });

    it('validates file existence', function () {
        $this->artisan('cards:import', [
            'game' => 'fab',
            'file' => '/nonexistent/path.json',
        ])
            ->assertFailed()
            ->expectsOutput('File not found: /nonexistent/path.json');
    });
});
