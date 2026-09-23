<?php

use App\Models\User;

/*
 * Es gibt keine Selbstregistrierung. Benutzer legt die Verwaltung an.
 *
 * Hier standen bis 23.09.2026 die Geruest-Tests aus dem Laravel-Starterkit
 * ("registration screen can be rendered", "new users can register"). Sie haben
 * getreulich bestaetigt, dass sich jeder ein Konto anlegen kann — also genau
 * das, was hier nicht gewollt ist.
 */
test('es gibt keine Registrierungsseite', function () {
    $this->get('/register')->assertNotFound();
});

test('ein Konto laesst sich nicht selbst anlegen', function () {
    $this->post('/register', [
        'name' => 'Test',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});
