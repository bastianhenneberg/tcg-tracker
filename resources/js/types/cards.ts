export interface CardGame {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
}

export interface CardSet {
    id: number;
    card_game_id: number;
    external_id: string;
    name: string;
    released_at: string | null;
}

export interface Card {
    id: number;
    card_game_id: number;
    external_id: string;
    name: string;
    data: Record<string, unknown>;
    card_game?: CardGame;
    printings?: CardPrinting[];
}

export type LanguageKey = 'EN' | 'DE' | 'FR' | 'ES' | 'IT' | 'JP' | 'CN' | 'KR';

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

export interface CardPrinting {
    id: number;
    card_id: number;
    card_set_id: number;
    external_id: string;
    collector_number: string;
    rarity: string | null;
    foiling: string | null;
    language: LanguageKey;
    image_url: string | null;
    data: Record<string, unknown>;
    card?: Card;
    card_set?: CardSet;
}

export interface CardFilters {
    search?: string;
    game?: number;
    set?: number;
    color?: string;
    type?: string;
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
