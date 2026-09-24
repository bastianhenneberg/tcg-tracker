<?php

/**
 * Der Kasten mit dem Logo oben links bleibt in beiden Modi lesbar.
 *
 * Was hier schiefging (23.09.2026, in zehn von elf Projekten gleichzeitig):
 * `--sidebar-primary` kommt aus dem shadcn-Register im Dunkelmodus als Blau
 * (`oklch(0.488 0.243 264.376)`) — ein Rest aus der Diagramm-Palette. Im hellen
 * Modus ist derselbe Token fast schwarz. Aus dieser Asymmetrie folgten zwei
 * Fehler auf einmal:
 *
 *   - Der Kasten hob sich kaum von der Seitenleiste ab: **2,63:1**.
 *   - Die Komponenten legten ein dunkles Logo darauf, weil sie einen HELLEN
 *     Kasten erwarteten: **3,08:1**. Sieben Projekte trugen dafuer sogar ein
 *     hartkodiertes `text-white dark:text-black` — eine Kopie des Tokens
 *     daneben, die dessen Wert widersprach.
 *
 * Warum dieser Test und nicht der Theme-Waechter: Der ueberspringt `sidebar*`
 * ausdruecklich („gestalterisch, bewusst eigene Werte"). Damit war der Wert
 * ungeprueft — und genau dort stand er falsch. Geprueft wird deshalb nicht der
 * Farbwert, sondern die EIGENSCHAFT: Hebt sich der Kasten ab, und traegt er
 * seine Vordergrundfarbe.
 */

use Illuminate\Support\Str;

/**
 * @return array{L: float, C: float, H: float}
 */
function oklchZerlegen(string $wert): array
{
    expect($wert)->toMatch('/oklch\(/', "Erwartet wurde ein oklch-Wert, bekommen: {$wert}");

    preg_match('/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/', $wert, $t);

    return ['L' => (float) ($t[1] ?? 0), 'C' => (float) ($t[2] ?? 0), 'H' => (float) ($t[3] ?? 0)];
}

/**
 * OKLCH → relative Leuchtdichte nach WCAG.
 */
function leuchtdichte(array $f): float
{
    $h = deg2rad($f['H']);
    $a = $f['C'] * cos($h);
    $b = $f['C'] * sin($h);

    $l = ($f['L'] + 0.3963377774 * $a + 0.2158037573 * $b) ** 3;
    $m = ($f['L'] - 0.1055613458 * $a - 0.0638541728 * $b) ** 3;
    $s = ($f['L'] - 0.0894841775 * $a - 1.2914855480 * $b) ** 3;

    $kanaele = [
        4.0767416621 * $l - 3.3077115913 * $m + 0.2309699292 * $s,
        -1.2684380046 * $l + 2.6097574011 * $m - 0.3413193965 * $s,
        -0.0041960863 * $l - 0.7034186147 * $m + 1.7076147010 * $s,
    ];

    $linear = array_map(function (float $c): float {
        $c = max(0.0, min(1.0, $c));
        $srgb = $c <= 0.0031308 ? 12.92 * $c : 1.055 * $c ** (1 / 2.4) - 0.055;

        return $srgb <= 0.04045 ? $srgb / 12.92 : (($srgb + 0.055) / 1.055) ** 2.4;
    }, $kanaele);

    return 0.2126 * $linear[0] + 0.7152 * $linear[1] + 0.0722 * $linear[2];
}

function kontrast(string $a, string $b): float
{
    $la = leuchtdichte(oklchZerlegen($a));
    $lb = leuchtdichte(oklchZerlegen($b));

    return (max($la, $lb) + 0.05) / (min($la, $lb) + 0.05);
}

/**
 * @return array<string, string>
 */
function farbblock(string $block): array
{
    $css = file_get_contents(resource_path('css/app.css'));

    /**
     * Kommentare zuerst heraus.
     *
     * Ohne das frisst der Ausdruck unten sich an einem Kommentar fest, der
     * selbst einen Token-Namen mit Doppelpunkt enthaelt: `[^;]+` laeuft dann
     * bis zum naechsten Semikolon — und das steht hinter der ECHTEN
     * Deklaration, die damit verschwindet. Genau so ist dieser Test beim
     * ersten Lauf in neun Projekten gescheitert.
     */
    $css = preg_replace('#/\*.*?\*/#s', '', $css);

    // Einrueckung erlaubt: in manchen Projekten steht der Block in `@layer base`.
    $muster = $block === 'light'
        ? '/^([ \t]*):root \{(.*?)^\1\}/ms'
        : '/^([ \t]*)\.dark \{(.*?)^\1\}/ms';

    expect(preg_match($muster, $css, $treffer))->toBe(1, "Block {$block} nicht in app.css gefunden");

    preg_match_all('/--([a-z0-9-]+):\s*([^;]+);/', $treffer[2], $paare, PREG_SET_ORDER);

    return collect($paare)->mapWithKeys(fn ($p) => [$p[1] => trim($p[2])])->all();
}

it('hebt den Logo-Kasten von der Seitenleiste ab', function (string $block) {
    $farben = farbblock($block);

    expect($farben)->toHaveKeys(['sidebar', 'sidebar-primary']);

    $gemessen = kontrast($farben['sidebar-primary'], $farben['sidebar']);

    expect($gemessen)->toBeGreaterThan(3.0, implode("\n", [
        "Im Block {$block} hebt sich der Logo-Kasten nicht genug von der Seitenleiste ab.",
        sprintf('Gemessen: %.2f:1 — verlangt werden 3,0 (WCAG AA fuer grafische Elemente).', $gemessen),
        "--sidebar-primary: {$farben['sidebar-primary']}",
        "--sidebar:         {$farben['sidebar']}",
        '',
        'Der shadcn-Registerwert fuer den Dunkelmodus liegt hier bei 2,63:1 — er',
        'stammt aus der Diagramm-Palette und ist an dieser Stelle kein Flaechenton.',
    ]));
})->with(['light', 'dark']);

it('laesst den Logo-Kasten seine Vordergrundfarbe tragen', function (string $block) {
    $farben = farbblock($block);

    expect($farben)->toHaveKeys(['sidebar-primary', 'sidebar-primary-foreground']);

    $gemessen = kontrast($farben['sidebar-primary-foreground'], $farben['sidebar-primary']);

    expect($gemessen)->toBeGreaterThan(4.5, implode("\n", [
        "Im Block {$block} ist die Vordergrundfarbe des Logo-Kastens nicht lesbar.",
        sprintf('Gemessen: %.2f:1 — verlangt werden 4,5 (WCAG AA).', $gemessen),
        "--sidebar-primary:            {$farben['sidebar-primary']}",
        "--sidebar-primary-foreground: {$farben['sidebar-primary-foreground']}",
        '',
        'Dieselben Werte fuer Grund und Schrift ergeben 1,00:1. Genau so stand es',
        'im CRM (beide oklch(0.985 0 0)) — unbemerkt, weil dort ein Bildlogo im',
        'Kasten liegt und Farbklassen darauf nichts bewirken.',
    ]));
})->with(['light', 'dark']);

it('haelt keine hartkodierte Logo-Farbe neben dem Token', function () {
    $pfad = resource_path('js/components/app-logo.tsx');

    if (! file_exists($pfad)) {
        $this->markTestSkipped('Dieses Projekt hat keine app-logo.tsx.');
    }

    $quelle = file_get_contents($pfad);

    expect(Str::contains($quelle, 'dark:text-black'))->toBeFalse(implode("\n", [
        'In app-logo.tsx steht wieder ein hartkodiertes `text-white dark:text-black`.',
        '',
        'Der Kasten setzt `text-sidebar-primary-foreground` — das Symbol erbt das.',
        'Eine Kopie daneben widerspricht dem Token, sobald sich dessen Wert aendert;',
        'genau so kam ein schwarzes Logo auf einen blauen Kasten (3,08:1).',
    ]));
});
