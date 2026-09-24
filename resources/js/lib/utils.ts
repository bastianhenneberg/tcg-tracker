import { InertiaLinkProps } from '@inertiajs/react';

/**
 * `cn` kommt aus dem shadcn-Paket, nicht mehr aus einer eigenen Zeile.
 *
 * Bis 24.09.2026 stand hier `twMerge(clsx(inputs))`. Das Register bezieht den
 * Helfer inzwischen aus dem Paket `cn` (github.com/shadcn-ui/cn, ohne eigene
 * Abhaengigkeiten) — die aufgefrischten Komponenten importieren also `from 'cn'`.
 * Damit gab es zwei Implementierungen derselben Sache im Projekt.
 *
 * Gegengeprueft, bevor umgestellt wurde: beide liefern in sechs Proben
 * identische Ergebnisse, auch beim Auflösen von Tailwind-Konflikten
 * (`px-2 px-4`), bei Arrays, Objekten und Varianten (`dark:bg-input/30`).
 *
 * Diese Wiederausfuhr bleibt, damit unsere eigenen Dateien weiter
 * `@/lib/utils` importieren koennen — die Registerkomponenten nehmen `cn`
 * direkt, so wie der Standard es vorgibt. Eine Implementierung, zwei Wege
 * dorthin.
 */
export { cn } from 'cn';

export function isSameUrl(
    url1: NonNullable<InertiaLinkProps['href']>,
    url2: NonNullable<InertiaLinkProps['href']>,
) {
    return resolveUrl(url1) === resolveUrl(url2);
}

export function resolveUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}
