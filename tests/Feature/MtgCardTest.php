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
