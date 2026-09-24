import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    js.configs.recommended,
    reactHooks.configs.flat.recommended,
    {
        rules: {
            /**
             * Sichtbar, aber nicht blockierend.
             *
             * Die Regel trifft zwei verschiedene Dinge. Das eine ist echter
             * Zustand, der sich ableiten liesse — das gehoert behoben. Das
             * andere ist das Laden von Daten beim Oeffnen eines Dialogs: Der
             * Ladezustand MUSS dabei gesetzt werden, und einen Ersatz hat
             * dieser Stapel nicht (keine Query-Bibliothek, Inertia laedt pro
             * Seite). Beides als Fehler zu fuehren hiesse, die restlichen
             * fuenfzehn Regeln nicht einschalten zu koennen.
             *
             * Nicht abgeschaltet, sondern herabgestuft: Die Fundstellen
             * bleiben bei jedem Lauf sichtbar und zaehlbar.
             */
            'react-hooks/set-state-in-effect': 'warn',

            /**
             * Meldet keinen Defekt, sondern eine entgangene Optimierung: Der
             * React-Compiler kann diese Komponente nicht uebernehmen, weil er
             * die von Hand gesetzte Memoisierung nicht nachweisen kann. In
             * keinem unserer Projekte laeuft der Compiler im Bau — die
             * Optimierung, die hier ausfaellt, gibt es also gar nicht.
             */
            'react-hooks/preserve-manual-memoization': 'warn',
        },
    },
    ...typescript.configs.recommended,
    {
        ...react.configs.flat.recommended,
        ...react.configs.flat['jsx-runtime'], // Required for React 17+
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        ignores: ['vendor', 'node_modules', 'public', 'bootstrap/ssr', 'tailwind.config.js'],
    },
    prettier, // Turn off all rules that might conflict with Prettier
];
