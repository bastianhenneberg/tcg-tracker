<?php

use App\Models\Mtg\MtgCard;
use App\Models\Mtg\MtgPrinting;
use App\Models\Mtg\MtgSet;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
});

describe('MTG Models', function () {
    it('MtgSet has many printings', function () {
        $set = MtgSet::factory()->create();
        $printing = MtgPrinting::factory()->create(['mtg_set_id' => $set->id]);

        expect($set->printings)->toHaveCount(1);
        expect($set->printings->first()->id)->toBe($printing->id);
    });

    it('MtgCard has many printings', function () {
        $card = MtgCard::factory()->create();
        $printing = MtgPrinting::factory()->create(['mtg_card_id' => $card->id]);

        expect($card->printings)->toHaveCount(1);
        expect($card->printings->first()->id)->toBe($printing->id);
    });

    it('MtgPrinting belongs to card and set', function () {
        $card = MtgCard::factory()->create();
        $set = MtgSet::factory()->create();
        $printing = MtgPrinting::factory()->create([
            'mtg_card_id' => $card->id,
            'mtg_set_id' => $set->id,
        ]);

        expect($printing->card->id)->toBe($card->id);
        expect($printing->set->id)->toBe($set->id);
    });

    it('MtgCard can check legality', function () {
        $card = MtgCard::factory()->create([
            'legalities' => [
                'standard' => 'Legal',
                'modern' => 'Legal',
                'vintage' => 'Restricted',
                'legacy' => 'Banned',
            ],
        ]);

        expect($card->isLegalIn('standard'))->toBeTrue();
        expect($card->isLegalIn('modern'))->toBeTrue();
        expect($card->isRestrictedIn('vintage'))->toBeTrue();
        expect($card->isBannedIn('legacy'))->toBeTrue();
        expect($card->isLegalIn('vintage'))->toBeFalse();
    });

    it('MtgCard colors are cast to array', function () {
        $card = MtgCard::factory()->create([
            'colors' => ['W', 'U'],
        ]);

        expect($card->colors)->toBeArray();
        expect($card->colors)->toContain('W', 'U');
    });

    it('MtgPrinting has rarity options', function () {
        $printing = MtgPrinting::factory()->rare()->create();
        expect($printing->rarity)->toBe('rare');

        $mythic = MtgPrinting::factory()->mythic()->create();
        expect($mythic->rarity)->toBe('mythic');
    });
});

describe('MTG Cards Index', function () {
    it('requires authentication', function () {
        $response = $this->get('/mtg/cards');

        $response->assertRedirect('/login');
    });

    it('displays cards page', function () {
        MtgCard::factory()->count(3)->create();

        $response = $this->actingAs($this->user)->get('/mtg/cards');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('mtg/cards/index'));
    });

    it('filters by color', function () {
        MtgCard::factory()->create(['colors' => ['W']]);
        MtgCard::factory()->create(['colors' => ['U']]);
        MtgCard::factory()->create(['colors' => []]);

        $response = $this->actingAs($this->user)->get('/mtg/cards?color=W');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('mtg/cards/index')
            ->has('cards.data', 1)
        );
    });

    it('filters colorless cards', function () {
        MtgCard::factory()->create(['colors' => ['W']]);
        MtgCard::factory()->create(['colors' => []]);
        MtgCard::factory()->create(['colors' => []]);

        $response = $this->actingAs($this->user)->get('/mtg/cards?color=C');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('mtg/cards/index')
            ->has('cards.data', 2)
        );
    });

    it('filters by type', function () {
        MtgCard::factory()->create(['types' => ['Creature']]);
        MtgCard::factory()->create(['types' => ['Instant']]);

        $response = $this->actingAs($this->user)->get('/mtg/cards?type=Creature');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('mtg/cards/index')
            ->has('cards.data', 1)
        );
    });

    it('searches by name', function () {
        MtgCard::factory()->create(['name' => 'Lightning Bolt']);
        MtgCard::factory()->create(['name' => 'Counterspell']);

        $response = $this->actingAs($this->user)->get('/mtg/cards?search=Lightning');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('mtg/cards/index')
            ->has('cards.data', 1)
        );
    });
});

describe('MTG Card Show', function () {
    it('requires authentication', function () {
        $card = MtgCard::factory()->create();

        $response = $this->get("/mtg/cards/{$card->id}");

        $response->assertRedirect('/login');
    });

    it('displays card details', function () {
        $card = MtgCard::factory()->create(['name' => 'Test Card']);
        MtgPrinting::factory()->count(2)->create(['mtg_card_id' => $card->id]);

        $response = $this->actingAs($this->user)->get("/mtg/cards/{$card->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('mtg/cards/show')
            ->has('card')
            ->has('card.printings', 2)
        );
    });
});

describe('MTG Sets Index', function () {
    it('requires authentication', function () {
        $response = $this->get('/mtg/sets');

        $response->assertRedirect('/login');
    });

    it('displays sets page', function () {
        MtgSet::factory()->count(3)->create();

        $response = $this->actingAs($this->user)->get('/mtg/sets');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('mtg/sets/index'));
    });

    it('filters by type', function () {
        MtgSet::factory()->expansion()->create();
        MtgSet::factory()->commander()->create();

        $response = $this->actingAs($this->user)->get('/mtg/sets?type=expansion');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('mtg/sets/index')
            ->has('sets.data', 1)
        );
    });
});

describe('MTG Printings', function () {
    it('printings index requires authentication', function () {
        $response = $this->get('/mtg/printings');

        $response->assertRedirect('/login');
    });

    it('displays printings page', function () {
        MtgPrinting::factory()->count(3)->create();

        $response = $this->actingAs($this->user)->get('/mtg/printings');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('mtg/printings/index'));
    });

    it('printing show displays details', function () {
        $printing = MtgPrinting::factory()->create();

        $response = $this->actingAs($this->user)->get("/mtg/printings/{$printing->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('mtg/printings/show')
            ->has('printing')
            ->has('allPrintings')
        );
    });
});
