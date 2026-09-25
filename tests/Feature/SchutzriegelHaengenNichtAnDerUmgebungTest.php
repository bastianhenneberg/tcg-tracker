<?php

/**
 * Zerstoerende Datenbankbefehle sind gesperrt — ausser im Testlauf.
 *
 * Vorgeschichte: Am 24.09.2026 zwischen 13:56 und 14:20 UTC war die
 * Produktionsdatenbank ploetzlich leer. 134.467 Drucke, 45.170 Karten, das
 * Inventar und beide Konten. Wiederhergestellt aus dem restic-Backup vom
 * selben Morgen (Bug #924).
 *
 * `PRAGMA freelist_count` stand auf 0 — geloescht wurde also nicht, die Datei
 * wurde NEU ANGELEGT. Welcher Befehl das war, ist nicht ermittelt.
 *
 * Dieser Test bewacht den Riegel, der die Frage weniger wichtig macht. Er
 * prueft beide Richtungen, denn beide koennen kaputtgehen: Haengt der Riegel
 * am falschen Anker, ist er in Produktion aus; haengt er an `true`, sperrt er
 * die eigene Testsuite aus (`RefreshDatabase` ruft `migrate:fresh`).
 */

use App\Providers\AppServiceProvider;
use Illuminate\Database\Console\WipeCommand;

function riegelSetzenFuer(string $umgebung): void
{
    app()->detectEnvironment(fn (): string => $umgebung);

    $verfahren = new ReflectionMethod(AppServiceProvider::class, 'configureDefaults');
    $verfahren->setAccessible(true);
    $verfahren->invoke(new AppServiceProvider(app()));
}

function zerstoerendeBefehleGesperrt(): bool
{
    $eigenschaft = new ReflectionProperty(WipeCommand::class, 'prohibitedFromRunning');
    $eigenschaft->setAccessible(true);

    return (bool) $eigenschaft->getValue();
}

afterEach(function () {
    riegelSetzenFuer('testing');
});

it('sperrt zerstoerende Datenbankbefehle ausserhalb des Testlaufs', function (string $umgebung) {
    riegelSetzenFuer($umgebung);

    expect(zerstoerendeBefehleGesperrt())->toBeTrue(
        "Unter APP_ENV={$umgebung} liefen `migrate:fresh` und `db:wipe` wieder durch.");
})->with(['dev', 'local', 'production']);

it('laesst die Testsuite ihre Datenbank weiterhin aufbauen', function () {
    riegelSetzenFuer('testing');

    expect(zerstoerendeBefehleGesperrt())->toBeFalse(
        'Im Testlauf muss `migrate:fresh` durchgehen — sonst sperrt sich '.
        'RefreshDatabase selbst aus.');
});
