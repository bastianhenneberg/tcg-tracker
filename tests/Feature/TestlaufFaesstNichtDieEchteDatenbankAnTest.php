<?php

/**
 * Der Testlauf darf die Produktionsdatenbank nicht anfassen.
 *
 * Die Isolierung steht in `phpunit.xml` (`DB_DATABASE=:memory:`) — und die
 * greift NICHT, wenn ein Konfig-Cache liegt. Laravel liest dann
 * `bootstrap/cache/config.php`, und darin steht der Pfad der echten Datei.
 *
 * Nachgemessen am 25.09.2026: Mit gebautem Konfig-Cache zeigte
 * `config('database.connections.sqlite.database')` im Testlauf auf
 *
 *     /home/codingmachine/Development/tcg-tracker/database/database.sqlite
 *
 * Die Feature-Tests liefen gegen die echten Daten und scheiterten an
 * Zaehlungen, die 5 statt 1 und 6 statt 2 fanden. Schlimmer waere der
 * umgekehrte Fall: `tests/Pest.php` haengt `RefreshDatabase` an JEDEN
 * Feature-Test, und das ruft `migrate:fresh`.
 *
 * `composer test` ruft vorher `config:clear` und ist deshalb sicher. Wer
 * `./vendor/bin/pest` oder `php artisan test` direkt aufruft — und das tut man
 * staendig, um einen einzelnen Test laufen zu lassen —, umgeht diesen Schutz.
 *
 * Dieser Test macht aus der stillen Falle einen lauten Fehlschlag. Er gehoert
 * zu Task #2683 und steht im Zusammenhang mit Bug #924, wo die
 * Produktionsdatenbank binnen 24 Minuten leer war.
 */
it('laeuft gegen eine Wegwerf-Datenbank, nicht gegen die echte', function () {
    $verbindung = config('database.default');
    $datenbank = config("database.connections.{$verbindung}.database");

    expect($datenbank)->toBe(':memory:', implode("\n  ", [
        "Der Testlauf zeigt auf {$datenbank}.",
        '',
        'Das ist die ECHTE Datenbank. Ursache ist fast immer ein liegender',
        'Konfig-Cache: der ueberstimmt die Werte aus phpunit.xml.',
        '',
        'Behebung:  php artisan config:clear',
        '',
        'Und danach `composer test` benutzen statt pest/artisan test direkt —',
        'das Skript raeumt den Cache selbst weg.',
    ]));
});
