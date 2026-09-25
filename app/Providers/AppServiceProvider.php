<?php

namespace App\Providers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Der Riegel gegen zerstoerende Datenbankbefehle.
     *
     * Vorgeschichte: Am 24.09.2026 zwischen 13:56 und 14:20 UTC war die
     * Produktionsdatenbank ploetzlich leer — 134.467 Drucke, 45.170 Karten,
     * das Inventar und beide Konten weg. Wiederhergestellt aus dem
     * restic-Backup vom selben Morgen (Bug #924).
     *
     * `PRAGMA freelist_count` stand auf 0. Geloescht wurde also nicht, die
     * Datei wurde NEU ANGELEGT — das Muster von `migrate:fresh` bzw. einem
     * `migrate` auf eine verschwundene Datei.
     *
     * Welcher Befehl es war, ist nicht ermittelt: nichts in der Shell-Historie,
     * nichts in den Sitzungsprotokollen, und der naheliegende Kandidat
     * (`composer test`, das hier `php artisan test` ausfuehrt) ist unter
     * denselben Bedingungen nachgestellt worden — die Daten blieben unberuehrt.
     *
     * Dieser Riegel macht die Frage weniger wichtig. `migrate:fresh`,
     * `migrate:refresh`, `migrate:reset` und `db:wipe` brechen jetzt ab.
     *
     * Warum nicht `true`, sondern „ausser im Testlauf": `RefreshDatabase` ruft
     * `migrate:fresh`. Ein unbedingter Riegel wuerde die eigene Testsuite
     * aussperren. Gleiches Muster wie in security-scanner und ai-brain.
     */
    protected function configureDefaults(): void
    {
        DB::prohibitDestructiveCommands(! $this->app->environment('testing'));
    }
}
