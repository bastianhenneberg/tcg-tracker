export interface MtgSet {
    id: number;
    code: string;
    name: string;
    type: string | null;
    release_date: string | null;
    base_set_size: number | null;
    total_set_size: number | null;
    is_foil_only: boolean;
    is_online_only: boolean;
    keyrune_code: string | null;
    printings_count?: number;
}

export interface MtgCard {
    id: number;
    oracle_id: string;
    name: string;
    mana_cost: string | null;
    mana_value: number | null;
    type_line: string | null;
    oracle_text: string | null;
    power: string | null;
    toughness: string | null;
    loyalty: string | null;
    defense: string | null;
    colors: string[] | null;
    color_identity: string[] | null;
    types: string[] | null;
    subtypes: string[] | null;
    supertypes: string[] | null;
    keywords: string[] | null;
    layout: string | null;
    legalities: Record<string, string> | null;
    edhrec_rank: number | null;
    printings?: MtgPrinting[];
}

export interface MtgPrinting {
    id: number;
    mtg_card_id: number;
    mtg_set_id: number;
    uuid: string;
    scryfall_id: string | null;
    multiverse_id: number | null;
    number: string;
    rarity: string;
    artist: string | null;
    flavor_text: string | null;
    watermark: string | null;
    border_color: string | null;
    frame_version: string | null;
    finishes: string[] | null;
    has_foil: boolean;
    has_non_foil: boolean;
    is_promo: boolean;
    is_full_art: boolean;
    is_textless: boolean;
    is_oversized: boolean;
    availability: string[] | null;
    tcgplayer_product_id: number | null;
    cardmarket_id: number | null;
    mtgo_id: number | null;
    arena_id: number | null;
    image_url: string | null;
    card?: MtgCard;
    set?: MtgSet;
}

export interface MtgCardFilters {
    search?: string;
    color?: string;
    type?: string;
    format?: string;
    mana_value?: string;
}

export interface MtgPrintingFilters {
    search?: string;
    set?: number;
    rarity?: string;
}

export interface MtgSetFilters {
    search?: string;
    type?: string;
}

export type ConditionKey = 'NM' | 'LP' | 'MP' | 'HP' | 'DM';
export type FinishKey = 'nonfoil' | 'foil' | 'etched';
export type LanguageKey = 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'ja' | 'ko' | 'zhs' | 'zht' | 'ru' | 'ph';

export const CONDITIONS: Record<ConditionKey, string> = {
    NM: 'Near Mint',
    LP: 'Lightly Played',
    MP: 'Moderately Played',
    HP: 'Heavily Played',
    DM: 'Damaged',
};

export const FINISHES: Record<FinishKey, string> = {
    nonfoil: 'Non-Foil',
    foil: 'Foil',
    etched: 'Etched Foil',
};

export const LANGUAGES: Record<LanguageKey, string> = {
    en: 'English',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
    it: 'Italiano',
    pt: 'Português',
    ja: 'Japanese',
    ko: 'Korean',
    zhs: 'Chinese (Simplified)',
    zht: 'Chinese (Traditional)',
    ru: 'Russian',
    ph: 'Phyrexian',
};

export interface MtgInventory {
    id: number;
    user_id: number;
    lot_id: number;
    mtg_printing_id: number;
    condition: ConditionKey;
    finish: FinishKey;
    language: LanguageKey;
    price: number | null;
    position_in_lot: number;
    sold_at: string | null;
    sold_price: number | null;
    printing?: MtgPrinting;
    lot?: {
        id: number;
        lot_number: string;
        box?: {
            id: number;
            name: string;
        };
    };
}

export interface MtgCollection {
    id: number;
    user_id: number;
    mtg_printing_id: number;
    condition: ConditionKey;
    finish: FinishKey;
    language: LanguageKey;
    quantity: number;
    notes: string | null;
    source_lot_id: number | null;
    printing?: MtgPrinting;
}

export interface MtgInventoryFilters {
    search?: string;
    condition?: string;
    lot?: number;
    rarity?: string;
    finish?: string;
}

export interface MtgCollectionFilters {
    search?: string;
    condition?: string;
    rarity?: string;
    finish?: string;
    color?: string;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

export const COLOR_LABELS: Record<string, string> = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
    C: 'Colorless',
};

export const RARITY_LABELS: Record<string, string> = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    mythic: 'Mythic Rare',
    special: 'Special',
    bonus: 'Bonus',
};

export const FORMAT_LABELS: Record<string, string> = {
    standard: 'Standard',
    pioneer: 'Pioneer',
    modern: 'Modern',
    legacy: 'Legacy',
    vintage: 'Vintage',
    commander: 'Commander',
    pauper: 'Pauper',
};

export function getRarityLabel(rarity: string | null): string {
    if (!rarity) return '-';
    return RARITY_LABELS[rarity] ?? rarity;
}

export function getColorSymbol(color: string): string {
    const symbols: Record<string, string> = {
        W: '☀️',
        U: '💧',
        B: '💀',
        R: '🔥',
        G: '🌲',
    };
    return symbols[color] ?? color;
}

export function getColorClass(colors: string[] | null): string {
    if (!colors || colors.length === 0) return 'bg-gray-400';
    if (colors.length > 1) return 'bg-gradient-to-r from-yellow-400 to-orange-400';

    const colorClasses: Record<string, string> = {
        W: 'bg-yellow-100 text-yellow-800',
        U: 'bg-blue-500',
        B: 'bg-gray-800',
        R: 'bg-red-500',
        G: 'bg-green-500',
    };
    return colorClasses[colors[0]] ?? 'bg-gray-400';
}

export function getConditionLabel(condition: string | null): string {
    if (!condition) return '-';
    return CONDITIONS[condition as ConditionKey] ?? condition;
}

export function getFinishLabel(finish: string | null): string {
    if (!finish) return 'Non-Foil';
    return FINISHES[finish as FinishKey] ?? finish;
}

export function getLanguageLabel(language: string | null): string {
    if (!language) return 'English';
    return LANGUAGES[language as LanguageKey] ?? language;
}
