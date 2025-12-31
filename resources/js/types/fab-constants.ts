// Flesh and Blood card data mappings
// Source: https://github.com/the-fab-cube/flesh-and-blood-cards

export const FAB_FOILING: Record<string, string> = {
    S: 'Standard',
    R: 'Rainbow Foil',
    C: 'Cold Foil',
    G: 'Gold Cold Foil',
};

export const FAB_RARITY: Record<string, string> = {
    C: 'Common',
    R: 'Rare',
    S: 'Super Rare',
    M: 'Majestic',
    L: 'Legendary',
    F: 'Fabled',
    T: 'Token',
    V: 'Marvel',
    P: 'Promo',
};

export const FAB_EDITION: Record<string, string> = {
    A: 'Alpha',
    F: 'First Edition',
    U: 'Unlimited',
    N: 'No Edition',
};

export const FAB_ART_VARIATION: Record<string, string> = {
    AB: 'Alternate Border',
    AA: 'Alternate Art',
    AT: 'Alternate Text',
    EA: 'Extended Art',
    FA: 'Full Art',
};

export function getFoilingLabel(code: string | null): string {
    if (!code) return '-';
    return FAB_FOILING[code] ?? code;
}

export function getRarityLabel(code: string | null): string {
    if (!code) return '-';
    return FAB_RARITY[code] ?? code;
}

export function getEditionLabel(code: string | null): string {
    if (!code) return '-';
    return FAB_EDITION[code] ?? code;
}
