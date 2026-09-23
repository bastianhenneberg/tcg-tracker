<?php

/**
 * Das Changelog-System ist erreichbar und haengt am Layout.
 *
 * Warum der letzte Test hier steht: `pendingChangelog` wird in
 * `HandleInertiaRequests` von Hand geteilt und im Sidebar-Layout von Hand
 * ausgelesen. Faellt eine der beiden Seiten weg, erscheint schlicht nie wieder
 * ein Fenster — ohne Fehler, ohne Meldung. Das faellt sonst erst auf, wenn eine
 * wichtige Meldung niemanden erreicht hat.
 */

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Peppermint\Changelog\Services\ChangelogService;

uses(RefreshDatabase::class);

test('Gaeste kommen nicht an die Changelog-Liste', function () {
    $this->get('/changelogs')->assertRedirect('/login');
});

test('Angemeldete sehen die Changelog-Liste', function () {
    $this->actingAs(User::factory()->create())
        ->get('/changelogs')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('changelogs/index'));
});

test('ein Eintrag aus dem Ordner changelogs taucht in der Liste auf', function () {
    $eintraege = app(ChangelogService::class)->published();

    expect($eintraege)->not->toBeEmpty(
        'Der Ordner changelogs/ enthaelt keinen veroeffentlichten Eintrag — '.
        'dann ist auch nicht geprueft, dass das Auslesen der Dateien funktioniert.'
    );

    $this->actingAs(User::factory()->create())
        ->get('/changelogs/'.$eintraege->first()['slug'])
        ->assertOk();
});

test('das Layout bekommt pendingChangelog geteilt', function () {
    $this->actingAs(User::factory()->create())
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('pendingChangelog'));
});
