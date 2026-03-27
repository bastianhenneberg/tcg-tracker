// Unified Card Types for all games

export interface Game {
    id: number;
    slug: string;
    name: string;
    description?: string;
    logo_url?: string;
    is_official: boolean;
}

export interface UnifiedCard {
    id: number;
    game: string;
    name: string;
    name_normalized: string;
    type_line?: string;
    types: string[];
    subtypes: string[];
    supertypes: string[];
    text?: string;
    text_normalized?: string;
    cost?: string;
    power?: string;
    defense?: string;
    health?: number;
    colors: string[];
    keywords: string[];
    legalities: Record<string, string>;
    game_specific: Record<string, unknown>;
    external_ids: Record<string, string>;
    printings?: UnifiedPrinting[];
    created_at: string;
    updated_at: string;
}

export interface UnifiedPrinting {
    id: number;
    card_id: number;
    set_id?: number;
    set_code: string;
    set_name?: string;
    collector_number: string;
    rarity?: string;
    rarity_label?: string;
    finish?: string;
    finish_label?: string;
    language: string;
    flavor_text?: string;
    artist?: string;
    image_url?: string;
    image_url_small?: string;
    image_url_back?: string;
    is_promo: boolean;
    is_reprint: boolean;
    is_variant: boolean;
    released_at?: string;
    prices?: Record<string, unknown>;
    game_specific: Record<string, unknown>;
    external_ids: Record<string, string>;
    card?: UnifiedCard;
    set?: UnifiedSet;
    owned_quantity?: number;
    created_at: string;
    updated_at: string;
}

export interface UnifiedSet {
    id: number;
    game: string;
    code: string;
    name: string;
    set_type?: string;
    released_at?: string;
    card_count?: number;
    icon_url?: string;
    game_specific: Record<string, unknown>;
    external_ids: Record<string, string>;
    printings_count?: number;
    created_at: string;
    updated_at: string;
}

export interface AvailablePrinting {
    id: number;
    card_id: number;
    finish: string;
    finish_label: string;
    collector_number: string;
}

export interface UnifiedInventory {
    id: number;
    user_id: number;
    printing_id: number;
    lot_id?: number;
    binder_id?: number;
    binder_page_id?: number;
    binder_slot?: number;
    position_in_slot?: number;
    condition: string;
    language: string;
    quantity: number;
    purchase_price?: number;
    sold_price?: number;
    sold_at?: string;
    notes?: string;
    in_collection: boolean;
    position_in_lot?: number;
    printing?: UnifiedPrinting;
    lot?: Lot;
    available_printings?: AvailablePrinting[];
    // Deck assignment fields (populated by backend for binder views)
    is_in_deck?: boolean;
    deck_names?: string[];
    created_at: string;
    updated_at: string;
}

export interface Lot {
    id: number;
    user_id: number;
    box_id?: number;
    lot_number: number;
    notes?: string;
    box?: Box;
    created_at: string;
    updated_at: string;
}

export interface Box {
    id: number;
    user_id: number;
    name: string;
    description?: string;
    location?: string;
    created_at: string;
    updated_at: string;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: PaginationLink[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface CardFilters {
    search?: string;
    type?: string;
    color?: string;
    format?: string;
    pitch?: string;
    [key: string]: string | undefined;
}

export interface FilterOptions {
    pitch?: Record<number, string>;
    colors?: Record<string, string>;
    formats?: Record<string, string>;
    card_types?: Record<string, string>;
    domains?: Record<string, string>;
}

// Common constants for all games
export type ConditionKey = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
export type LanguageKey = 'EN' | 'DE' | 'FR' | 'ES' | 'IT' | 'JP' | 'CN' | 'KR';

export const CONDITIONS: Record<ConditionKey, string> = {
    NM: 'Near Mint',
    LP: 'Lightly Played',
    MP: 'Moderately Played',
    HP: 'Heavily Played',
    DMG: 'Damaged',
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

export function getConditionLabel(condition: string | null): string {
    if (!condition) return 'Unknown';
    return CONDITIONS[condition as ConditionKey] ?? condition;
}

export function getLanguageLabel(language: string | null): string {
    if (!language) return 'English';
    return LANGUAGES[language as LanguageKey] ?? language;
}

// Helper to get color indicator for FAB pitch
export function getPitchColor(pitch?: number | string): string {
    const p = typeof pitch === 'string' ? parseInt(pitch, 10) : pitch;
    switch (p) {
        case 1:
            return 'red';
        case 2:
            return 'yellow';
        case 3:
            return 'blue';
        default:
            return 'none';
    }
}

// Helper to get the game's unified slug
export function getUnifiedSlug(gameSlug: string): string {
    const map: Record<string, string> = {
        'fab': 'fab',
        'magic-the-gathering': 'mtg',
        'onepiece': 'onepiece',
        'riftbound': 'riftbound',
    };
    return map[gameSlug] ?? gameSlug;
}
