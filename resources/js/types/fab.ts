export interface FabSet {
    id: number;
    external_id: string;
    name: string;
    released_at: string | null;
}

export interface FabCard {
    id: number;
    external_id: string;
    name: string;
    pitch: number | null;
    cost: string | null;
    power: string | null;
    defense: string | null;
    health: number | null;
    intelligence: number | null;
    arcane: number | null;
    types: string[];
    traits: string[];
    card_keywords: string[];
    abilities_and_effects: string[];
    functional_text: string | null;
    functional_text_plain: string | null;
    type_text: string | null;
    played_horizontally: boolean;
    blitz_legal: boolean;
    cc_legal: boolean;
    commoner_legal: boolean;
    ll_legal: boolean;
    printings?: FabPrinting[];
}

export type RarityKey = 'C' | 'R' | 'S' | 'M' | 'L' | 'F' | 'P' | 'T';
export type FoilingKey = 'S' | 'R' | 'C' | 'G';
export type LanguageKey = 'EN' | 'DE' | 'FR' | 'ES' | 'IT' | 'JP' | 'CN' | 'KR';
export type EditionKey = 'A' | 'F' | 'N' | 'U';
export type ConditionKey = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';

export const RARITIES: Record<RarityKey, string> = {
    C: 'Common',
    R: 'Rare',
    S: 'Super Rare',
    M: 'Majestic',
    L: 'Legendary',
    F: 'Fabled',
    P: 'Promo',
    T: 'Token',
};

export const FOILINGS: Record<FoilingKey, string> = {
    S: 'Standard',
    R: 'Rainbow Foil',
    C: 'Cold Foil',
    G: 'Gold Cold Foil',
};

export const LANGUAGES: Record<LanguageKey, string> = {
    EN: 'English',
    DE: 'Deutsch',
    FR: 'Français',
    ES: 'Español',
    IT: 'Italiano',
    JP: 'Japanese',
    CN: 'Chinese',
    KR: 'Korean',
};

export const EDITIONS: Record<EditionKey, string> = {
    A: 'Alpha',
    F: 'First Edition',
    N: 'Normal',
    U: 'Unlimited',
};

export const CONDITIONS: Record<ConditionKey, string> = {
    NM: 'Near Mint',
    LP: 'Lightly Played',
    MP: 'Moderately Played',
    HP: 'Heavily Played',
    DMG: 'Damaged',
};

export interface FabPrinting {
    id: number;
    fab_card_id: number;
    fab_set_id: number;
    external_id: string;
    collector_number: string;
    rarity: RarityKey | null;
    rarity_label?: string;
    foiling: FoilingKey | null;
    foiling_label?: string;
    language: LanguageKey;
    language_label?: string;
    edition: EditionKey | null;
    edition_label?: string;
    image_url: string | null;
    artists: string[] | null;
    flavor_text: string | null;
    flavor_text_plain: string | null;
    tcgplayer_product_id: string | null;
    tcgplayer_url: string | null;
    card?: FabCard;
    set?: FabSet;
}

export interface FabInventory {
    id: number;
    user_id: number;
    lot_id: number;
    fab_printing_id: number;
    condition: ConditionKey;
    condition_label?: string;
    language: LanguageKey;
    language_label?: string;
    price: number | null;
    position_in_lot: number;
    sold_at: string | null;
    sold_price: number | null;
    printing?: FabPrinting;
    lot?: {
        id: number;
        lot_number: string;
        box?: {
            id: number;
            name: string;
        };
    };
}

export interface FabCollection {
    id: number;
    user_id: number;
    fab_printing_id: number;
    condition: ConditionKey;
    condition_label?: string;
    language: LanguageKey;
    language_label?: string;
    quantity: number;
    notes: string | null;
    source_lot_id: number | null;
    printing?: FabPrinting;
}

export interface FabCardFilters {
    search?: string;
    pitch?: number;
    type?: string;
    format?: string;
}

export interface FabPrintingFilters {
    search?: string;
    set?: number;
    rarity?: string;
    foiling?: string;
    language?: string;
    edition?: string;
}

export interface FabInventoryFilters {
    search?: string;
    condition?: string;
    lot?: number;
    rarity?: string;
    foiling?: string;
}

export interface FabCollectionFilters {
    search?: string;
    condition?: string;
    rarity?: string;
    foiling?: string;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

// Helper functions
export function getRarityLabel(rarity: string | null): string {
    if (!rarity) return 'Unknown';
    return RARITIES[rarity as RarityKey] ?? rarity;
}

export function getFoilingLabel(foiling: string | null): string {
    if (!foiling) return 'Standard';
    return FOILINGS[foiling as FoilingKey] ?? foiling;
}

export function getLanguageLabel(language: string | null): string {
    if (!language) return 'English';
    return LANGUAGES[language as LanguageKey] ?? language;
}

export function getEditionLabel(edition: string | null): string {
    if (!edition) return 'Normal';
    return EDITIONS[edition as EditionKey] ?? edition;
}

export function getConditionLabel(condition: string | null): string {
    if (!condition) return 'Unknown';
    return CONDITIONS[condition as ConditionKey] ?? condition;
}

export function getPitchColor(pitch: number | null): string | null {
    switch (pitch) {
        case 1:
            return 'red';
        case 2:
            return 'yellow';
        case 3:
            return 'blue';
        default:
            return null;
    }
}
