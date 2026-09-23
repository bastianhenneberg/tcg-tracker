import shadcn from '@shadcn/lint';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Der Design-Waechter. Laeuft ueber `npm run lint:design` und haengt an
 * `npm run lint` mit dran. Jede Ausnahme hat einen Grund.
 */
export default [
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        linterOptions: { reportUnusedDisableDirectives: 'off' },

        /* `@typescript-eslint` ist hier nur registriert, nicht eingeschaltet:
           Der Quelltext traegt `eslint-disable`-Kommentare fuer dessen Regeln,
           und ohne die Registrierung meldet jeder davon „Definition for rule
           ... was not found" und deckt die echten Befunde zu. */
        plugins: {
            shadcn,
            '@typescript-eslint': tseslint.plugin,
            'react-hooks': reactHooks,
        },
        rules: {
            /**
             * AUS. Gemessen am 23.09.2026: **681** Befunde. Die Regel
             * meldet jedes Umstylen einer shadcn-Komponente — das ist kein
             * Pruefer mehr, sondern Rauschen.
             */
            'shadcn/no-restyle': 'off',

            'shadcn/no-raw-colors': 'error',

            /**
             * Masse sind Layout-Entscheidungen und gehoeren nicht ins Theme.
             * Schriftgroessen sind bewusst NICHT freigegeben.
             */
            'shadcn/no-arbitrary-values': [
                'error',
                {
                    allow: [
                        'w-*', 'h-*', 'max-w-*', 'max-h-*', 'min-w-*', 'min-h-*',
                        'grid-cols-*', 'grid-rows-*', 'aspect-*', 'basis-*', 'flex-*',
                        'top-*', 'left-*', 'right-*', 'bottom-*', 'inset-*',
                        'translate-*', 'scale-*', 'rotate-*', 'z-*',
                        'rounded-*', 'border-*', 'ring-*', 'shadow-*',
                        'transition-*', 'duration-*', 'delay-*', 'animate-*',
                        /* Der Schlagschatten ueber den Kartenbildern ist eine
                           Gestaltungsangabe, keine Farbe aus dem Theme. */
                        'drop-shadow-*',
                        'group-data-*', 'data-*', 'before:*', 'after:*',
                        'p-*', 'px-*', 'py-*', 'pt-*', 'pb-*', 'pl-*', 'pr-*',
                        'm-*', 'mx-*', 'my-*', 'mt-*', 'mb-*', 'ml-*', 'mr-*',
                        'gap-*', 'space-x-*', 'space-y-*',
                        'sm:*', 'md:*', 'lg:*', 'xl:*',
                    ],
                },
            ],

            /** Laufzeitwerte lassen sich nicht als feste Klasse schreiben. */
            'shadcn/no-inline-styles': [
                'error',
                {
                    allow: [
                        'backgroundColor', 'color', 'borderColor', 'border', 'background',
                        'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
                        'left', 'top', 'right', 'bottom', 'zIndex', 'aspectRatio',
                        'transform', 'transformOrigin', 'transition', 'opacity', 'filter',
                        'display', 'verticalAlign', 'animationDelay',
                    ],
                },
            ],

            'shadcn/require-static-classes': 'error',
            'shadcn/no-unknown-classes': 'error',
        },
    },
    {
        /**
         * Die shadcn-Komponenten selbst bringen Masse, dynamische Klassen und
         * Inline-Styles von Haus aus mit — das ist ihr Bauplan. `no-raw-colors`
         * bleibt hier ABSICHTLICH an: eine rohe Farbe in einer Basiskomponente
         * wirkt sich auf die ganze Anwendung aus.
         */
        files: ['resources/js/components/ui/**/*.{ts,tsx}'],
        rules: {
            'shadcn/no-arbitrary-values': 'off',
            'shadcn/require-static-classes': 'off',
            'shadcn/no-inline-styles': 'off',
        },
    },
    {
        /*
         * Klassen, die nicht von Tailwind kommen: `toaster` ist die Markierung
         * fuer den `group-[.toaster]:`-Selektor, `no-print` steht in den
         * Druckregeln, `binder-page` und `pocket-compact` haengen an eigenen
         * CSS-Regeln der Sammelmappen-Ansicht.
         */
        files: [
            'resources/js/components/ui/sonner.tsx',
            'resources/js/pages/collection/binders/**/*.tsx',
            /* `no-print` steht in den Druckregeln der Sammelmappe. */
            'resources/js/pages/collection/**/*.tsx',
            /* `no-print`, `binder-page` und `pocket-compact` stehen im
               <style>-Block derselben Datei. */
            'resources/js/pages/sets/print.tsx',
        ],
        rules: { 'shadcn/no-unknown-classes': 'off' },
    },
    {
        /* Die Kartenvorschau setzt Groesse und Lage aus den Bilddaten. */
        files: ['resources/js/components/deck/card-thumbnail.tsx'],
        rules: { 'shadcn/require-static-classes': 'off' },
    },
    {
        /*
         * Der Scanner zeichnet seine Aussparung mit einem 9999px-Schatten und
         * hebt die Beschriftung mit einem doppelten Textschatten ab — beides
         * laesst sich nicht als Utility ausdruecken. Die Kartenvorschau
         * berechnet ihre Lage aus der Mausposition.
         */
        files: [
            'resources/js/components/scanner/ScannerCamera.tsx',
            'resources/js/components/deck/hover-card-preview.tsx',
            'resources/js/pages/collection/binders/pages/show.tsx',
            'resources/js/pages/collection/binders/show.tsx',
            /* Der Deckbauer rechnet Spaltenraster und Lagen aus den Daten. */
            'resources/js/pages/decks/builder.tsx',
            /* Die Druckansicht bringt ihre Druckregeln in einem <style>-Element
               mit — sie gelten nur beim Drucken. */
            'resources/js/pages/sets/print.tsx',
        ],
        rules: { 'shadcn/no-inline-styles': 'off' },
    },
];
