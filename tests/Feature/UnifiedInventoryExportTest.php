<?php

use App\Models\Game;
use App\Models\UnifiedCard;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->game = Game::factory()->official()->create([
        'slug' => 'fab',
        'name' => 'Flesh and Blood',
    ]);
});

it('requires authentication', function () {
    $this->get('/g/fab/inventory/export')
        ->assertRedirect('/login');
});

it('exports inventory as CSV', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Test Card']);
    $printing = UnifiedPrinting::factory()->forCard($card)->create([
        'collector_number' => 'WTR001',
        'set_name' => 'Welcome to Rathe',
        'finish' => 'S', // Standard/non-foil
    ]);

    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'condition' => 'NM',
        'language' => 'EN',
        'quantity' => 1,
        'in_collection' => false,
        'purchase_price' => 10.50,
        'notes' => 'Test note',
    ]);

    $response = $this->actingAs($this->user)
        ->get('/g/fab/inventory/export');

    $response->assertOk()
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
        ->assertDownload();

    $content = $response->streamedContent();

    // Check BOM
    expect(str_starts_with($content, "\xEF\xBB\xBF"))->toBeTrue();

    // Check header row
    expect($content)->toContain('idProduct,quantity,name,set,condition,language,isFoil,price,comment');

    // Check data row - idProduct is number only (without set prefix)
    expect($content)->toContain('001'); // WTR001 -> 001
    expect($content)->toContain('Test Card');
    expect($content)->toContain('NM');
    expect($content)->toContain('English');
    expect($content)->toContain('Test note');
});

it('includes foil type in card name for FAB', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Foil Card']);
    $printing = UnifiedPrinting::factory()->forCard($card)->create([
        'collector_number' => 'WTR002',
        'finish' => 'R',
        'finish_label' => 'Rainbow Foil',
    ]);

    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'condition' => 'NM',
        'language' => 'EN',
        'in_collection' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->get('/g/fab/inventory/export');

    $content = $response->streamedContent();

    // Foil type should be in card name, e.g., "Foil Card (Rainbow Foil)"
    expect($content)->toContain('Foil Card (Rainbow Foil)');
});

it('excludes collection items from export', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Inventory Card']);
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    // Create inventory item
    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => false,
    ]);

    // Create collection item (should not appear)
    $collectionCard = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Collection Card']);
    $collectionPrinting = UnifiedPrinting::factory()->forCard($collectionCard)->create();

    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $collectionPrinting->id,
        'in_collection' => true,
    ]);

    $response = $this->actingAs($this->user)
        ->get('/g/fab/inventory/export');

    $content = $response->streamedContent();

    expect($content)->toContain('Inventory Card');
    expect($content)->not->toContain('Collection Card');
});

it('excludes other users inventory from export', function () {
    $otherUser = User::factory()->create();

    $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'My Card']);
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'in_collection' => false,
    ]);

    $otherCard = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Other User Card']);
    $otherPrinting = UnifiedPrinting::factory()->forCard($otherCard)->create();

    UnifiedInventory::factory()->create([
        'user_id' => $otherUser->id,
        'printing_id' => $otherPrinting->id,
        'in_collection' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->get('/g/fab/inventory/export');

    $content = $response->streamedContent();

    expect($content)->toContain('My Card');
    expect($content)->not->toContain('Other User Card');
});

it('includes color in card name for FAB', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create([
        'name' => 'Colored Card',
        'game_specific' => ['color' => 'Blue', 'pitch' => 3],
    ]);
    $printing = UnifiedPrinting::factory()->forCard($card)->create([
        'collector_number' => 'WTR003',
        'finish' => 'S',
        'finish_label' => 'Standard',
    ]);

    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'condition' => 'NM',
        'language' => 'EN',
        'in_collection' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->get('/g/fab/inventory/export');

    $content = $response->streamedContent();

    // Card name should include color and (Regular) for standard finish
    expect($content)->toContain('Colored Card (Blue) (Regular)');
});

it('includes color and foil type together for FAB', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create([
        'name' => 'Colorful Foil Card',
        'game_specific' => ['color' => 'Red', 'pitch' => 1],
    ]);
    $printing = UnifiedPrinting::factory()->forCard($card)->create([
        'collector_number' => 'WTR004',
        'finish' => 'R',
        'finish_label' => 'Rainbow Foil',
    ]);

    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'condition' => 'NM',
        'language' => 'EN',
        'in_collection' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->get('/g/fab/inventory/export');

    $content = $response->streamedContent();

    // Card name should include both color and foil type
    expect($content)->toContain('Colorful Foil Card (Red) (Rainbow Foil)');
});

it('maps language codes to full names', function () {
    $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'German Card']);
    $printing = UnifiedPrinting::factory()->forCard($card)->create();

    UnifiedInventory::factory()->create([
        'user_id' => $this->user->id,
        'printing_id' => $printing->id,
        'language' => 'DE',
        'in_collection' => false,
    ]);

    $response = $this->actingAs($this->user)
        ->get('/g/fab/inventory/export');

    $content = $response->streamedContent();

    expect($content)->toContain('German');
});

it('returns 404 for non-existent game', function () {
    $this->actingAs($this->user)
        ->get('/g/nonexistent/inventory/export')
        ->assertNotFound();
});
