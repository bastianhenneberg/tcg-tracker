/**
 * Rohe Tailwind-Palettenklassen melden — der blinde Fleck von `no-raw-colors`.
 *
 * `@shadcn/lint` prueft Farbliterale: `#22c55e`, `oklch(...)`, `rgb(...)`.
 * Eine Klasse wie `bg-green-500` ist fuer die Regel unauffaellig, steht aber
 * genauso an der Token-Schicht vorbei: Sie bleibt im Dunkelmodus hell und
 * faellt aus jeder Theme-Anpassung heraus.
 *
 * Nachgewiesen am 24.09.2026: `resources/js/lib/notification-icons.ts` im
 * Manager enthaelt 18 solcher Klassen und null Farbliterale — `no-raw-colors`
 * meldete dort nichts, auch mit abgeschalteter Ausnahme. Die Ausnahmen, die
 * jemand fuer diese Dateien eingetragen hatte, schalteten eine Regel ab, die
 * gar nicht ansprang.
 *
 * Was die Regel NICHT will: Kategorienfarben verbieten. Ein Programmpunkt, eine
 * Urlaubsart, eine vom Benutzer gewaehlte Projektfarbe — dafuer gibt es im
 * Theme keine Entsprechung, und es soll auch keine geben. Solche Stellen
 * gehoeren in die Ausnahmeliste der Design-Konfiguration, mit Begruendung.
 * Der Unterschied zu vorher ist, dass sie dann ausdruecklich dort stehen statt
 * unbemerkt durchzurutschen.
 */

const PRAEFIXE = [
    'bg', 'text', 'border', 'ring', 'from', 'to', 'via', 'fill', 'stroke',
    'divide', 'decoration', 'outline', 'accent', 'caret', 'placeholder', 'shadow',
];

const FARBEN = [
    'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber',
    'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue',
    'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

const MUSTER = new RegExp(
    `\\b(${PRAEFIXE.join('|')})-(${FARBEN.join('|')})-(\\d{2,3})\\b`,
    'g',
);

/** Was statt der Klasse gemeint sein koennte — nur ein Hinweis, kein Befehl. */
const NAHELIEGEND = {
    green: 'success', emerald: 'success', lime: 'success',
    red: 'destructive', rose: 'destructive',
    amber: 'warning', yellow: 'warning', orange: 'warning',
    blue: 'info', sky: 'info', cyan: 'info',
    gray: 'muted', slate: 'muted', zinc: 'muted', neutral: 'muted', stone: 'muted',
};

/**
 * Handgebaute Modusfarben.
 *
 * `text-black dark:text-white` ist `text-foreground`, von Hand nachgebaut.
 * `bg-white ... dark:bg-muted` ist `bg-background` mit Umweg. Beides sieht
 * weder `no-raw-colors` (kein Farbliteral) noch das Muster oben (keine
 * Palettenklasse mit Zahl) — gezaehlt am 25.09.2026: 487 solcher Stellen quer
 * durch acht Projekte.
 *
 * Gemeldet wird NUR die Paarung: eine deckende Schwarz-/Weiss-Klasse, die im
 * selben Klassenstring eine `dark:`-Entsprechung derselben Eigenschaft hat.
 * Genau das ist der Fall, in dem ein Token existiert und umgangen wurde.
 *
 * Bewusst NICHT gemeldet, weil dort richtig:
 * - `text-white` allein auf gesaettigter Flaeche (`bg-purple-600 text-white`)
 * - Ueberlagerungen mit Deckkraft (`bg-black/60`) und Verlaufsstopps
 *   (`from-black/70`) — die sollen in beiden Modi gleich aussehen
 */
const EIGENSCHAFTEN = ['bg', 'text', 'border'];

/**
 * Die Varianten-Kette wird mitgefangen, damit die `dark:`-Haelfte des Paares
 * uebersprungen werden kann. Sonst meldet die Regel dieselbe Stelle zweimal —
 * einmal fuer `text-black`, einmal fuer `dark:text-white`.
 */
const DECKEND = new RegExp(
    `(?<![\\w/-])((?:[a-z-]+:)*)(${EIGENSCHAFTEN.join('|')})-(black|white)(?![\\w/-])`,
    'g',
);

/** Gibt es zu dieser Eigenschaft eine `dark:`-Angabe im selben String? */
function hatDunkelGegenstueck(text, eigenschaft) {
    return new RegExp(`\\bdark:(?:hover:|focus:|active:|group-hover:)?${eigenschaft}-`).test(text);
}

const TOKENVORSCHLAG = {
    text: 'text-foreground',
    bg: 'bg-background (oder bg-card)',
    border: 'border',
};

export default {
    meta: {
        type: 'problem',
        docs: { description: 'Keine rohen Tailwind-Palettenklassen — Farben kommen aus dem Theme.' },
        schema: [],
        messages: {
            modusfarbe:
                '`{{klasse}}` ist zusammen mit seiner `dark:`-Entsprechung ein von Hand '
                + 'nachgebautes `{{token}}`. Das Token dreht in beiden Modi mit, ohne dass '
                + 'jemand an zwei Stellen daran denken muss. (Allein stehendes '
                + '`text-white` auf gesaettigter Flaeche und Ueberlagerungen mit '
                + 'Deckkraft meldet diese Regel nicht.)',
            palette:
                '`{{klasse}}` greift an der Token-Schicht vorbei: bleibt im Dunkelmodus hell '
                + 'und faellt aus jeder Theme-Anpassung heraus.{{hinweis}} Ist es eine '
                + 'Kategorienfarbe ohne Entsprechung im Theme, gehoert die Datei mit '
                + 'Begruendung in die Ausnahmeliste von eslint.design.config.js.',
        },
    },

    create(kontext) {
        const pruefe = (knoten, text) => {
            for (const treffer of text.matchAll(DECKEND)) {
                const [klasse, varianten, eigenschaft] = treffer;

                if (varianten.includes('dark:')) {
                    continue;
                }

                if (!hatDunkelGegenstueck(text, eigenschaft)) {
                    continue;
                }

                kontext.report({
                    node: knoten,
                    messageId: 'modusfarbe',
                    data: { klasse, token: TOKENVORSCHLAG[eigenschaft] },
                });
            }

            for (const treffer of text.matchAll(MUSTER)) {
                const [klasse, , farbe] = treffer;
                const token = NAHELIEGEND[farbe];

                kontext.report({
                    node: knoten,
                    messageId: 'palette',
                    data: {
                        klasse,
                        hinweis: token ? ` Naheliegend waere \`${token}\`.` : '',
                    },
                });
            }
        };

        return {
            Literal(knoten) {
                if (typeof knoten.value === 'string') {
                    pruefe(knoten, knoten.value);
                }
            },
            TemplateElement(knoten) {
                pruefe(knoten, knoten.value.raw);
            },
            JSXText(knoten) {
                pruefe(knoten, knoten.value);
            },
        };
    },
};
