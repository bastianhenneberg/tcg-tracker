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

export default {
    meta: {
        type: 'problem',
        docs: { description: 'Keine rohen Tailwind-Palettenklassen — Farben kommen aus dem Theme.' },
        schema: [],
        messages: {
            palette:
                '`{{klasse}}` greift an der Token-Schicht vorbei: bleibt im Dunkelmodus hell '
                + 'und faellt aus jeder Theme-Anpassung heraus.{{hinweis}} Ist es eine '
                + 'Kategorienfarbe ohne Entsprechung im Theme, gehoert die Datei mit '
                + 'Begruendung in die Ausnahmeliste von eslint.design.config.js.',
        },
    },

    create(kontext) {
        const pruefe = (knoten, text) => {
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
