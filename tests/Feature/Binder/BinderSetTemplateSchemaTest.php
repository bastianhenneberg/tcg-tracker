<?php

use App\Models\Binder;
use App\Models\BinderPage;
use App\Models\BinderPageSlot;
use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use App\Models\UnifiedSet;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->set = UnifiedSet::create([
        'game' => 'fab',
        'code' => 'OMN',
        'name' => 'Omens of the Third Age',
    ]);
});

it('links a binder to a set', function () {
    $binder = Binder::factory()->create([
        'user_id' => $this->user->id,
        'unified_set_id' => $this->set->id,
    ]);

    expect($binder->set)->not->toBeNull();
    expect($binder->set->code)->toBe('OMN');
});

it('keeps binders without a set working (nullable)', function () {
    $binder = Binder::factory()->create(['user_id' => $this->user->id]);

    expect($binder->unified_set_id)->toBeNull();
    expect($binder->set)->toBeNull();
});

it('stores template slots that reference a printing and orders them by slot', function () {
    $binder = Binder::factory()->create([
        'user_id' => $this->user->id,
        'unified_set_id' => $this->set->id,
    ]);
    $page = BinderPage::factory()->create([
        'user_id' => $this->user->id,
        'binder_id' => $binder->id,
    ]);

    foreach ([3, 1, 2] as $slot) {
        $card = UnifiedCard::factory()->forGame('fab')->create();
        $printing = UnifiedPrinting::factory()->forCard($card)->create(['set_id' => $this->set->id]);
        BinderPageSlot::create([
            'binder_page_id' => $page->id,
            'slot' => $slot,
            'printing_id' => $printing->id,
        ]);
    }

    $slots = $page->fresh()->templateSlots;

    expect($slots)->toHaveCount(3);
    expect($slots->pluck('slot')->all())->toBe([1, 2, 3]);
    expect($slots->first()->printing)->not->toBeNull();
});

it('deletes template slots when their page is deleted (cascade)', function () {
    $binder = Binder::factory()->create(['user_id' => $this->user->id]);
    $page = BinderPage::factory()->create([
        'user_id' => $this->user->id,
        'binder_id' => $binder->id,
    ]);
    $card = UnifiedCard::factory()->forGame('fab')->create();
    $printing = UnifiedPrinting::factory()->forCard($card)->create(['set_id' => $this->set->id]);
    BinderPageSlot::create([
        'binder_page_id' => $page->id,
        'slot' => 1,
        'printing_id' => $printing->id,
    ]);

    $page->delete();

    expect(BinderPageSlot::count())->toBe(0);
});

it('enforces one template card per slot per page', function () {
    $binder = Binder::factory()->create(['user_id' => $this->user->id]);
    $page = BinderPage::factory()->create([
        'user_id' => $this->user->id,
        'binder_id' => $binder->id,
    ]);
    $printingFor = function () {
        $card = UnifiedCard::factory()->forGame('fab')->create();

        return UnifiedPrinting::factory()->forCard($card)->create(['set_id' => $this->set->id]);
    };

    BinderPageSlot::create([
        'binder_page_id' => $page->id,
        'slot' => 1,
        'printing_id' => $printingFor()->id,
    ]);

    expect(fn () => BinderPageSlot::create([
        'binder_page_id' => $page->id,
        'slot' => 1,
        'printing_id' => $printingFor()->id,
    ]))->toThrow(QueryException::class);
});
