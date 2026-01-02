<?php

use App\Models\Game;
use App\Models\GameAttribute;
use App\Models\GameFormat;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
});

describe('Game Models', function () {
    it('Game belongs to user', function () {
        $game = Game::factory()->create(['user_id' => $this->user->id]);

        expect($game->user->id)->toBe($this->user->id);
    });

    it('Game has many attributes', function () {
        $game = Game::factory()->create();
        GameAttribute::factory()->count(3)->create(['game_id' => $game->id]);

        expect($game->attributes)->toHaveCount(3);
    });

    it('Game has many formats', function () {
        $game = Game::factory()->create();
        GameFormat::factory()->count(2)->create(['game_id' => $game->id]);

        expect($game->formats)->toHaveCount(2);
    });

    it('Game can filter by official', function () {
        Game::factory()->official()->create();
        Game::factory()->custom()->create(['user_id' => $this->user->id]);

        expect(Game::official()->count())->toBe(1);
        expect(Game::custom()->count())->toBe(1);
    });

    it('Game helper methods return correct attributes', function () {
        $game = Game::factory()->create();
        GameAttribute::factory()->create(['game_id' => $game->id, 'type' => 'rarity']);
        GameAttribute::factory()->create(['game_id' => $game->id, 'type' => 'foiling']);
        GameAttribute::factory()->create(['game_id' => $game->id, 'type' => 'condition']);

        expect($game->rarities()->count())->toBe(1);
        expect($game->foilings()->count())->toBe(1);
        expect($game->conditions()->count())->toBe(1);
    });
});

describe('Games Index', function () {
    it('requires authentication', function () {
        $response = $this->get('/settings/games');

        $response->assertRedirect('/login');
    });

    it('displays games page', function () {
        Game::factory()->official()->create();
        Game::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->get('/settings/games');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('settings/games')
            ->has('games', 2)
        );
    });

    it('shows official games to all users', function () {
        Game::factory()->official()->create(['name' => 'Official Game']);

        $response = $this->actingAs($this->user)->get('/settings/games');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('games', 1)
            ->where('games.0.name', 'Official Game')
        );
    });

    it('only shows own custom games', function () {
        $otherUser = User::factory()->create();
        Game::factory()->create(['user_id' => $this->user->id, 'name' => 'My Game']);
        Game::factory()->create(['user_id' => $otherUser->id, 'name' => 'Other Game']);

        $response = $this->actingAs($this->user)->get('/settings/games');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('games', 1)
            ->where('games.0.name', 'My Game')
        );
    });
});

describe('Game Create', function () {
    it('requires authentication', function () {
        $response = $this->post('/settings/games', [
            'name' => 'Test Game',
        ]);

        $response->assertRedirect('/login');
    });

    it('creates a new game', function () {
        $response = $this->actingAs($this->user)->post('/settings/games', [
            'name' => 'My Custom Game',
            'description' => 'A test game',
        ]);

        $response->assertRedirect();

        $game = Game::where('name', 'My Custom Game')->first();
        expect($game)->not->toBeNull();
        expect($game->user_id)->toBe($this->user->id);
        expect($game->is_official)->toBeFalse();
        expect($game->slug)->toBe('my-custom-game');
    });

    it('creates default conditions for new game', function () {
        $this->actingAs($this->user)->post('/settings/games', [
            'name' => 'Game With Conditions',
        ]);

        $game = Game::where('name', 'Game With Conditions')->first();
        $conditions = $game->conditions()->get();

        expect($conditions)->toHaveCount(5);
        expect($conditions->pluck('key')->toArray())->toContain('NM', 'LP', 'MP', 'HP', 'DM');
    });

    it('validates required name', function () {
        $response = $this->actingAs($this->user)->post('/settings/games', [
            'description' => 'No name provided',
        ]);

        $response->assertSessionHasErrors('name');
    });
});

describe('Game Update', function () {
    it('updates own custom game', function () {
        $game = Game::factory()->create(['user_id' => $this->user->id, 'name' => 'Old Name']);

        $response = $this->actingAs($this->user)->patch("/settings/games/{$game->id}", [
            'name' => 'New Name',
        ]);

        $response->assertRedirect();
        expect($game->fresh()->name)->toBe('New Name');
    });

    it('cannot update official game', function () {
        $game = Game::factory()->official()->create();

        $response = $this->actingAs($this->user)->patch("/settings/games/{$game->id}", [
            'name' => 'Hacked Name',
        ]);

        $response->assertForbidden();
    });

    it('cannot update other users game', function () {
        $otherUser = User::factory()->create();
        $game = Game::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->actingAs($this->user)->patch("/settings/games/{$game->id}", [
            'name' => 'Hacked Name',
        ]);

        $response->assertForbidden();
    });
});

describe('Game Delete', function () {
    it('deletes own custom game', function () {
        $game = Game::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->delete("/settings/games/{$game->id}");

        $response->assertRedirect();
        expect(Game::find($game->id))->toBeNull();
    });

    it('cannot delete official game', function () {
        $game = Game::factory()->official()->create();

        $response = $this->actingAs($this->user)->delete("/settings/games/{$game->id}");

        $response->assertForbidden();
    });

    it('cannot delete other users game', function () {
        $otherUser = User::factory()->create();
        $game = Game::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->actingAs($this->user)->delete("/settings/games/{$game->id}");

        $response->assertForbidden();
    });
});

describe('Game Show', function () {
    it('shows own custom game', function () {
        $game = Game::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->get("/settings/games/{$game->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('settings/games/show')
            ->has('game')
        );
    });

    it('shows official game', function () {
        $game = Game::factory()->official()->create();

        $response = $this->actingAs($this->user)->get("/settings/games/{$game->id}");

        $response->assertOk();
    });

    it('cannot view other users custom game', function () {
        $otherUser = User::factory()->create();
        $game = Game::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->actingAs($this->user)->get("/settings/games/{$game->id}");

        $response->assertForbidden();
    });
});

describe('Game Attributes', function () {
    it('adds attribute to own game', function () {
        $game = Game::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->post("/settings/games/{$game->id}/attributes", [
            'type' => 'rarity',
            'key' => 'legendary',
            'label' => 'Legendary',
        ]);

        $response->assertRedirect();
        expect($game->attributes()->where('key', 'legendary')->exists())->toBeTrue();
    });

    it('cannot add attribute to official game', function () {
        $game = Game::factory()->official()->create();

        $response = $this->actingAs($this->user)->post("/settings/games/{$game->id}/attributes", [
            'type' => 'rarity',
            'key' => 'legendary',
            'label' => 'Legendary',
        ]);

        $response->assertForbidden();
    });

    it('deletes attribute from own game', function () {
        $game = Game::factory()->create(['user_id' => $this->user->id]);
        $attribute = GameAttribute::factory()->create(['game_id' => $game->id]);

        $response = $this->actingAs($this->user)
            ->delete("/settings/games/{$game->id}/attributes/{$attribute->id}");

        $response->assertRedirect();
        expect(GameAttribute::find($attribute->id))->toBeNull();
    });
});

describe('Game Formats', function () {
    it('adds format to own game', function () {
        $game = Game::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->post("/settings/games/{$game->id}/formats", [
            'name' => 'Standard',
            'description' => 'Standard format',
        ]);

        $response->assertRedirect();
        expect($game->formats()->where('name', 'Standard')->exists())->toBeTrue();
    });

    it('cannot add format to official game', function () {
        $game = Game::factory()->official()->create();

        $response = $this->actingAs($this->user)->post("/settings/games/{$game->id}/formats", [
            'name' => 'Hacked Format',
        ]);

        $response->assertForbidden();
    });

    it('deletes format from own game', function () {
        $game = Game::factory()->create(['user_id' => $this->user->id]);
        $format = GameFormat::factory()->create(['game_id' => $game->id]);

        $response = $this->actingAs($this->user)
            ->delete("/settings/games/{$game->id}/formats/{$format->id}");

        $response->assertRedirect();
        expect(GameFormat::find($format->id))->toBeNull();
    });
});
