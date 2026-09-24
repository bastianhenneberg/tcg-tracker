<?php

/**
 * Das Theme folgt dem shadcn-ui-Standard.
 *
 * Vorgabe vom 22.09.2026: shadcn-ui ist der Ausgangspunkt, immer. Eigene
 * Werte nur dort, wo wir sie wirklich brauchen — und dann ausdruecklich, in
 * der Ausnahmeliste unten, mit Begruendung.
 *
 * Warum ein Test und nicht der Linter: `@shadcn/lint` prueft, welche Klassen
 * im Code stehen. Was die Klassen bedeuten — also die Werte in `:root` und
 * `.dark` — sieht er nicht. Genau dort war die Abweichung.
 *
 * Was sie gekostet hat: `--destructive` stand im Dunkelmodus auf einem
 * veralteten Wert (`oklch(0.396 …)`, ein Flaechen-Rot). Als Schrift ergab das
 * **1,97:1** — WCAG AA verlangt 4,5. Betroffen waren 144 Stellen, und es fiel
 * erst auf, als ein Waechter-Test in einem ANDEREN Projekt daran scheiterte.
 * Der Standardwert (`oklch(0.704 …)`) traegt als Schrift 6,84:1.
 *
 * Die Vergleichswerte liegen als Fixture bei, damit der Test nicht bei jedem
 * Lauf ins Netz greift. Auffrischen:
 *
 *     curl -sfL https://ui.shadcn.com/r/colors/neutral.json \
 *         -o tests/fixtures/shadcn-theme.json
 *
 * Danach diesen Test laufen lassen: Was dann rot wird, ist eine Aenderung am
 * Standard — die will angesehen und uebernommen, nicht weggedrueckt werden.
 */

/**
 * Bewusste Abweichungen vom Standard.
 *
 * Jeder Eintrag braucht einen Grund. Ein leerer Eintrag ist kein Eintrag —
 * wer hier etwas hinzufuegt, ohne zu erklaeren warum, verschiebt die Frage
 * nur auf den Naechsten.
 */
const ABWEICHUNGEN = [
    /*
     * Der Kasten mit dem Logo oben links.
     *
     * Der Registerwert fuer den Dunkelmodus ist ein Blau
     * (oklch(0.488 0.243 264.376)) — ein Rest aus der Diagramm-Palette. Im
     * hellen Modus ist derselbe Token fast schwarz. Daraus folgten zwei Fehler:
     * Der Kasten hob sich nur mit 2,63:1 von der Seitenleiste ab, und die
     * Komponenten legten ein dunkles Logo darauf, weil sie einen hellen Kasten
     * erwarteten (3,08:1). Betroffen waren zehn von elf Projekten.
     *
     * Jetzt spiegelt der Kasten --primary: hell im Dunkelmodus, dunkel im
     * hellen. 14,22:1 in beide Richtungen. Die Eigenschaft selbst bewacht
     * LogoKastenBleibtLesbarTest — der prueft Kontraste, nicht Farbwerte, und
     * haelt damit auch, wenn der Standard sich aendert.
     */
    'dark.sidebar-primary' => 'Registerwert ist ein Diagramm-Blau, 2,63:1 gegen die Seitenleiste — Entscheidung vom 24.09.2026',
    'dark.sidebar-primary-foreground' => 'Muss zum geaenderten Kasten passen, sonst hell auf hell — Entscheidung vom 24.09.2026',

    /*
     * Die Diagramm-Palette.
     *
     * Die Fixture ist `colors/neutral.json` — die GRUNDFARBEN-Datei. Die
     * monochromatisiert per Konstruktion alles, `chart-*` eingeschlossen, und
     * setzt hell und dunkel auf dieselben fuenf Graustufen. Fuer Flaechen und
     * Schrift ist das richtig. Fuer ein Diagramm ist es ein Defekt, und zwar
     * ein gemessener: weil beide Bloecke gleich sind, faellt in jedem Modus ein
     * Ende der Skala in den Untergrund.
     *
     *     --chart-1: oklch(0.87 0 0)   gegen die helle Karte   1,48:1
     *     --chart-5: oklch(0.269 0 0)  gegen die dunkle Karte  1,19:1
     *
     * Aufgefallen am 24.09.2026 an „Events nach Status" in peppermint-connect:
     * Der Kreis war da — zwei Sektoren mit echten Pfaddaten, keine
     * Konsolenfehler —, nur hellgrau auf Weiss. Sichtbar blieb allein die
     * handgebaute Legende darunter, weshalb es wie ein kaputtes recharts
     * aussah. War es nicht.
     *
     * Uebernommen ist shadcn' eigene Diagramm-Palette, die jedes Theme ausser
     * der neutralen Grundfarbe mitbringt — also kein eigener Entwurf, nur die
     * richtige Quelle. Schwaechster Wert: 3,59:1 hell, 2,63:1 dunkel.
     *
     * Die Eigenschaft selbst bewacht der Test unten: hell und dunkel duerfen
     * nicht gleich sein. Der haelt auch, wenn shadcn die Palette aendert.
     */
    'light.chart-1' => 'Neutral-Fixture ist monochrom und hell=dunkel — Entscheidung vom 24.09.2026',
    'light.chart-2' => 'Neutral-Fixture ist monochrom und hell=dunkel — Entscheidung vom 24.09.2026',
    'light.chart-3' => 'Neutral-Fixture ist monochrom und hell=dunkel — Entscheidung vom 24.09.2026',
    'light.chart-4' => 'Neutral-Fixture ist monochrom und hell=dunkel — Entscheidung vom 24.09.2026',
    'light.chart-5' => 'Neutral-Fixture ist monochrom und hell=dunkel — Entscheidung vom 24.09.2026',
    'dark.chart-1' => 'Neutral-Fixture ist monochrom und hell=dunkel — Entscheidung vom 24.09.2026',
    'dark.chart-2' => 'Neutral-Fixture ist monochrom und hell=dunkel — Entscheidung vom 24.09.2026',
    'dark.chart-3' => 'Neutral-Fixture ist monochrom und hell=dunkel — Entscheidung vom 24.09.2026',
    'dark.chart-4' => 'Neutral-Fixture ist monochrom und hell=dunkel — Entscheidung vom 24.09.2026',
    'dark.chart-5' => 'Neutral-Fixture ist monochrom und hell=dunkel — Entscheidung vom 24.09.2026',
    // Leer: Das Theme steht vollstaendig auf dem shadcn-Standard, es gibt
    // nichts zu begruenden.
    //
    // Beispiel, falls einmal noetig:
    // 'dark.primary' => 'Markenfarbe statt Graustufe — Entscheidung vom TT.MM.JJJJ',
];

function themeWerte(string $block): array
{
    $css = file_get_contents(resource_path('css/app.css'));

    /**
     * Kommentare zuerst heraus.
     *
     * Ohne das frisst der Ausdruck unten sich an einem Kommentar fest, der
     * selbst einen Token-Namen mit Doppelpunkt enthaelt: `[^;]+` laeuft dann
     * bis zum naechsten Semikolon — und das steht hinter der ECHTEN
     * Deklaration, die damit aus der Liste verschwindet. Ein Token, das der
     * Parser nicht sieht, prueft dieser Test auch nicht.
     *
     * Aufgefallen am 24.09.2026: Der Kommentar, der die Abweichung bei
     * `--sidebar-primary` begruendet, nennt darin `--primary-foreground:` —
     * und liess damit die Deklaration direkt darunter verschwinden.
     */
    $css = preg_replace('#/\\*.*?\\*/#s', '', $css);

    $muster = $block === 'light'
        ? '/^:root \{(.*?)^\}/ms'
        : '/^\.dark \{(.*?)^\}/ms';

    expect(preg_match($muster, $css, $treffer))->toBe(1, "Block {$block} nicht in app.css gefunden");

    preg_match_all('/--([a-z0-9-]+):\s*([^;]+);/', $treffer[1], $paare, PREG_SET_ORDER);

    return collect($paare)->mapWithKeys(fn ($p) => [$p[1] => trim($p[2])])->all();
}

function shadcnStandard(string $block): array
{
    $pfad = base_path('tests/fixtures/shadcn-theme.json');

    expect(file_exists($pfad))->toBeTrue('Fixture fehlt — siehe Kopfkommentar zum Auffrischen.');

    return json_decode(file_get_contents($pfad), true)['cssVars'][$block];
}

/**
 * Alle Themewerte, `sidebar-*` und `chart-*` eingeschlossen — die standen hier
 * auf der alten HSL-Palette aus dem Erstcommit und sind mitgezogen worden.
 */
it('haelt die Grundfarben auf dem shadcn-Standard', function (string $block) {
    $ist = themeWerte($block);
    $soll = shadcnStandard($block);

    $abweichend = [];

    foreach ($soll as $name => $standardwert) {
        if ($name === 'radius') {
            continue;
        }

        if (array_key_exists("{$block}.{$name}", ABWEICHUNGEN)) {
            continue;
        }

        $unserer = $ist[$name] ?? '(fehlt)';

        if ($unserer !== trim($standardwert)) {
            $abweichend[] = "--{$name}: {$unserer} statt {$standardwert}";
        }
    }

    expect($abweichend)->toBe([], implode("\n  ", array_merge(
        ["Der Block {$block} weicht vom shadcn-Standard ab:"],
        $abweichend,
        ['', 'Entweder den Standardwert uebernehmen — oder die Abweichung in ABWEICHUNGEN', 'eintragen, mit Grund.']
    )));
})->with(['light', 'dark']);

/**
 * Der Fall, der das hier ausgeloest hat: eine Farbe, die als Flaeche gedacht
 * ist, aber als Schrift benutzt wird. Der Test oben faengt das nur, solange
 * jemand den Standard nicht mit einer Begruendung aushebelt — deshalb hier
 * noch einmal die Eigenschaft selbst, unabhaengig vom Vergleichswert.
 */
it('haelt --destructive im Dunkelmodus hell genug fuer Schrift', function () {
    $dunkel = themeWerte('dark');

    expect($dunkel)->toHaveKey('destructive');

    preg_match('/oklch\(\s*([\d.]+)/', $dunkel['destructive'], $t);

    expect((float) ($t[1] ?? 0))
        ->toBeGreaterThan(0.6, implode("\n", [
            '--destructive ist im Dunkelmodus zu dunkel fuer Schrift.',
            'Bei L 0.396 ergab text-destructive 1,97:1 gegen den dunklen Grund;',
            'WCAG AA verlangt 4,5. Der shadcn-Standard liegt bei L 0.704 (6,84:1).',
        ]));
});

/**
 * Was dieses Projekt ZUSAETZLICH zum Standard fuehrt — vollstaendig und mit
 * vollem Namen, damit es niemand beilaeufig erweitert.
 *
 * Warum das noetig ist: Der Test oben laeuft ueber die Schluessel des
 * STANDARDS. Ein zusaetzliches lokales Token sieht er gar nicht. Genau so hat
 * `--destructive-foreground` in fuenf Projekten ueberlebt — es trug denselben
 * Wert wie `--destructive`, ergab also rote Schrift auf rotem Grund (1,00:1),
 * und der aktuelle shadcn-Standard kennt es gar nicht mehr. Aufgefallen ist es
 * erst, als jemand die Werte von Hand nachgemessen hat.
 *
 * Bewusst die vollen Namen und nicht die Staemme: Waere hier nur `destructive`
 * eingetragen, rutschte `destructive-foreground` als Rolle davon wieder durch
 * — also genau der Fall, den dieser Test verhindern soll.
 */
const EIGENE_TOKENS = [
    'destructive-border',
    'destructive-subtle',
    'destructive-subtle-foreground',
    'info',
    'info-border',
    'info-foreground',
    'info-subtle',
    'info-subtle-foreground',
    'success',
    'success-border',
    'success-foreground',
    'success-subtle',
    'success-subtle-foreground',
    'warning',
    'warning-border',
    'warning-foreground',
    'warning-subtle',
    'warning-subtle-foreground',
];

/**
 * Die Gegenrichtung zum Test oben: kein Token im Theme, das weder im Standard
 * steht noch hier eingetragen ist.
 */
it('fuehrt kein Token, das weder Standard noch ausdruecklich eigenes ist', function (string $block) {
    $soll = shadcnStandard($block);

    $unbekannt = collect(array_keys(themeWerte($block)))
        ->reject(fn ($name) => array_key_exists($name, $soll) || $name === 'radius')
        ->reject(fn ($name) => in_array($name, EIGENE_TOKENS, true))
        ->values()
        ->all();

    expect($unbekannt)->toBe([], implode("\n  ", array_merge(
        ["Im Block {$block} stehen Tokens, die der Standard nicht kennt:"],
        $unbekannt,
        ['', 'Entweder entfernen — oder in EIGENE_TOKENS eintragen, mit vollem', 'Namen. Ein Token, das niemand kennt, wird auch von niemandem gepflegt.']
    )));
})->with(['light', 'dark']);

/**
 * Die Eigenschaft hinter der Ausnahme oben, unabhaengig von Farbwerten: Eine
 * Diagramm-Palette, die in beiden Bloecken dieselbe ist, hat gar keine fuer den
 * Dunkelmodus. Dann faellt zwangslaeufig ein Ende der Skala in den Untergrund —
 * das hellste auf der hellen Karte, das dunkelste auf der dunklen.
 */
it('fuehrt getrennte Diagrammfarben fuer hell und dunkel', function () {
    $hell = themeWerte('light');
    $dunkel = themeWerte('dark');

    $gleich = collect(range(1, 5))
        ->map(fn (int $n) => "chart-{$n}")
        ->filter(fn (string $name) => ($hell[$name] ?? null) === ($dunkel[$name] ?? null))
        ->values()
        ->all();

    expect($gleich)->toBe([], implode("\n  ", array_merge(
        ['Diese Diagrammfarben sind in hell und dunkel identisch:'],
        $gleich,
        ['', 'Damit hat der Dunkelmodus keine eigene Palette. Die Werte aus der', 'neutralen Grundfarbe sind dafuer nicht zu gebrauchen — siehe ABWEICHUNGEN.']
    )));
});
