<?php

use App\Models\Deck;
use App\Models\DeckCard;
use App\Models\DeckInventoryAssignment;
use App\Models\DeckZone;
use App\Models\GameFormat;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\User;
use App\Services\DeckInventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = new DeckInventoryService;
    $this->user = User::factory()->create();
});

describe('assignInventoryToDeck', function () {
    it('assigns inventory items to deck cards', function () {
        $printing = UnifiedPrinting::factory()->create();
        $deck = Deck::factory()
            ->for($this->user)
            ->for(GameFormat::factory())
            ->create();

        $zone = DeckZone::factory()->main()->create(['game_format_id' => $deck->game_format_id]);

        DeckCard::factory()->create([
            'deck_id' => $deck->id,
            'deck_zone_id' => $zone->id,
            'printing_id' => $printing->id,
            'quantity' => 2,
        ]);

        UnifiedInventory::factory()->create([
            'user_id' => $this->user->id,
            'printing_id' => $printing->id,
            'quantity' => 3,
            'condition' => 'NM',
            'in_collection' => true,
        ]);

        $result = $this->service->assignInventoryToDeck($deck);

        expect($result['assigned'])->toBe(2);
        expect($result['missing'])->toBeEmpty();
        expect(DeckInventoryAssignment::where('deck_id', $deck->id)->count())->toBe(1);
        expect(DeckInventoryAssignment::where('deck_id', $deck->id)->first()->quantity)->toBe(2);
    });

    it('reports missing cards when inventory is insufficient', function () {
        $printing = UnifiedPrinting::factory()->create();
        $deck = Deck::factory()
            ->for($this->user)
            ->for(GameFormat::factory())
            ->create();

        $zone = DeckZone::factory()->main()->create(['game_format_id' => $deck->game_format_id]);

        DeckCard::factory()->create([
            'deck_id' => $deck->id,
            'deck_zone_id' => $zone->id,
            'printing_id' => $printing->id,
            'quantity' => 4,
        ]);

        UnifiedInventory::factory()->create([
            'user_id' => $this->user->id,
            'printing_id' => $printing->id,
            'quantity' => 2,
            'condition' => 'NM',
            'in_collection' => true,
        ]);

        $result = $this->service->assignInventoryToDeck($deck);

        expect($result['assigned'])->toBe(2);
        expect($result['missing'])->not->toBeEmpty();
        expect(array_sum($result['missing']))->toBe(2);
    });

    it('prefers better condition cards', function () {
        $printing = UnifiedPrinting::factory()->create();
        $deck = Deck::factory()
            ->for($this->user)
            ->for(GameFormat::factory())
            ->create();

        $zone = DeckZone::factory()->main()->create(['game_format_id' => $deck->game_format_id]);

        DeckCard::factory()->create([
            'deck_id' => $deck->id,
            'deck_zone_id' => $zone->id,
            'printing_id' => $printing->id,
            'quantity' => 2,
        ]);

        $nmInventory = UnifiedInventory::factory()->create([
            'user_id' => $this->user->id,
            'printing_id' => $printing->id,
            'quantity' => 1,
            'condition' => 'NM',
            'in_collection' => true,
        ]);

        $lpInventory = UnifiedInventory::factory()->create([
            'user_id' => $this->user->id,
            'printing_id' => $printing->id,
            'quantity' => 1,
            'condition' => 'LP',
            'in_collection' => true,
        ]);

        $this->service->assignInventoryToDeck($deck);

        // NM should be assigned first
        $assignments = DeckInventoryAssignment::where('deck_id', $deck->id)->get();
        expect($assignments->count())->toBe(2);

        // Check that NM was assigned
        expect($assignments->where('unified_inventory_id', $nmInventory->id)->first()->quantity)->toBe(1);
        expect($assignments->where('unified_inventory_id', $lpInventory->id)->first()->quantity)->toBe(1);
    });
});

describe('clearAssignments', function () {
    it('removes all assignments for a deck', function () {
        $printing = UnifiedPrinting::factory()->create();
        $deck = Deck::factory()
            ->for($this->user)
            ->for(GameFormat::factory())
            ->create();

        $inventory = UnifiedInventory::factory()->create([
            'user_id' => $this->user->id,
            'printing_id' => $printing->id,
            'in_collection' => true,
        ]);

        DeckInventoryAssignment::create([
            'deck_id' => $deck->id,
            'unified_inventory_id' => $inventory->id,
            'quantity' => 2,
        ]);

        expect(DeckInventoryAssignment::where('deck_id', $deck->id)->count())->toBe(1);

        $deleted = $this->service->clearAssignments($deck);

        expect($deleted)->toBe(1);
        expect(DeckInventoryAssignment::where('deck_id', $deck->id)->count())->toBe(0);
    });
});

describe('getDeckInventoryStatus', function () {
    it('returns correct status summary', function () {
        $printing = UnifiedPrinting::factory()->create();
        $deck = Deck::factory()
            ->for($this->user)
            ->for(GameFormat::factory())
            ->create();

        $zone = DeckZone::factory()->main()->create(['game_format_id' => $deck->game_format_id]);

        DeckCard::factory()->create([
            'deck_id' => $deck->id,
            'deck_zone_id' => $zone->id,
            'printing_id' => $printing->id,
            'quantity' => 4,
        ]);

        $inventory = UnifiedInventory::factory()->create([
            'user_id' => $this->user->id,
            'printing_id' => $printing->id,
            'in_collection' => true,
        ]);

        DeckInventoryAssignment::create([
            'deck_id' => $deck->id,
            'unified_inventory_id' => $inventory->id,
            'quantity' => 2,
        ]);

        $status = $this->service->getDeckInventoryStatus($deck);

        expect($status['total_cards'])->toBe(4);
        expect($status['assigned_cards'])->toBe(2);
        expect(array_sum($status['missing_cards']))->toBe(2);
    });
});
