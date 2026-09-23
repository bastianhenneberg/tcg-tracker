<?php

use App\Models\User;

/*
 * Die Wurzel zeigt nichts eigenes, sie leitet weiter. Hier stand vorher der
 * Geruest-Test von Laravel ("returns a successful response") — er prueft, DASS
 * etwas kommt, nicht WAS. Genau deshalb ist jahrelang niemandem aufgefallen,
 * dass unter / die Laravel-Werbeseite stand.
 */
it('schickt Gaeste zur Anmeldung', function () {
    $this->get('/')->assertRedirect(route('login'));
});

it('schickt Angemeldete aufs Dashboard', function () {
    $this->actingAs(User::factory()->create())
        ->get('/')
        ->assertRedirect(route('dashboard'));
});
