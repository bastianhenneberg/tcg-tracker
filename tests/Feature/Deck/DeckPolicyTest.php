<?php

use App\Models\Deck;
use App\Models\User;
use App\Policies\DeckPolicy;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

describe('DeckPolicy', function () {
    describe('view', function () {
        it('allows owner to view own deck', function () {
            $user = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $user->id, 'is_public' => false]);

            $policy = new DeckPolicy;

            expect($policy->view($user, $deck))->toBeTrue();
        });

        it('allows anyone to view public deck', function () {
            $owner = User::factory()->create();
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $owner->id, 'is_public' => true]);

            $policy = new DeckPolicy;

            expect($policy->view($otherUser, $deck))->toBeTrue();
        });

        it('denies non-owner to view private deck', function () {
            $owner = User::factory()->create();
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $owner->id, 'is_public' => false]);

            $policy = new DeckPolicy;

            expect($policy->view($otherUser, $deck))->toBeFalse();
        });
    });

    describe('update', function () {
        it('allows owner to update own deck', function () {
            $user = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $user->id]);

            $policy = new DeckPolicy;

            expect($policy->update($user, $deck))->toBeTrue();
        });

        it('denies non-owner to update deck', function () {
            $owner = User::factory()->create();
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $owner->id]);

            $policy = new DeckPolicy;

            expect($policy->update($otherUser, $deck))->toBeFalse();
        });

        it('denies non-owner to update even public deck', function () {
            $owner = User::factory()->create();
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $owner->id, 'is_public' => true]);

            $policy = new DeckPolicy;

            expect($policy->update($otherUser, $deck))->toBeFalse();
        });
    });

    describe('delete', function () {
        it('allows owner to delete own deck', function () {
            $user = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $user->id]);

            $policy = new DeckPolicy;

            expect($policy->delete($user, $deck))->toBeTrue();
        });

        it('denies non-owner to delete deck', function () {
            $owner = User::factory()->create();
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $owner->id]);

            $policy = new DeckPolicy;

            expect($policy->delete($otherUser, $deck))->toBeFalse();
        });
    });

    describe('create', function () {
        it('allows any authenticated user to create a deck', function () {
            $user = User::factory()->create();

            $policy = new DeckPolicy;

            expect($policy->create($user))->toBeTrue();
        });
    });

    describe('viewAny', function () {
        it('allows any authenticated user to view any decks', function () {
            $user = User::factory()->create();

            $policy = new DeckPolicy;

            expect($policy->viewAny($user))->toBeTrue();
        });
    });

    describe('restore', function () {
        it('allows owner to restore own deck', function () {
            $user = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $user->id]);

            $policy = new DeckPolicy;

            expect($policy->restore($user, $deck))->toBeTrue();
        });

        it('denies non-owner to restore deck', function () {
            $owner = User::factory()->create();
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $owner->id]);

            $policy = new DeckPolicy;

            expect($policy->restore($otherUser, $deck))->toBeFalse();
        });
    });

    describe('forceDelete', function () {
        it('allows owner to force delete own deck', function () {
            $user = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $user->id]);

            $policy = new DeckPolicy;

            expect($policy->forceDelete($user, $deck))->toBeTrue();
        });

        it('denies non-owner to force delete deck', function () {
            $owner = User::factory()->create();
            $otherUser = User::factory()->create();
            $deck = Deck::factory()->create(['user_id' => $owner->id]);

            $policy = new DeckPolicy;

            expect($policy->forceDelete($otherUser, $deck))->toBeFalse();
        });
    });
});
