export interface OpSet {
    id: number;
    external_id: string;
    name: string;
    type: string | null;
    released_at: string | null;
}

export interface OpCard {
    id: number;
    external_id: string;
    name: string;
    card_type: CardTypeKey;
    color: ColorKey;
    color_secondary: ColorKey | null;
    cost: number | null;
    power: number | null;
    life: number | null;
    counter: number | null;
    attribute: AttributeKey | null;
    types: string[];
    effect: string | null;
    trigger: string | null;
    printings?: OpPrinting[];
}

export type CardTypeKey = 'Leader' | 'Character' | 'Event' | 'Stage';
export type ColorKey = 'Red' | 'Green' | 'Blue' | 'Purple' | 'Black' | 'Yellow';
export type AttributeKey = 'Slash' | 'Strike' | 'Ranged' | 'Special' | 'Wisdom';
export type RarityKey = 'L' | 'C' | 'UC' | 'R' | 'SR' | 'SEC' | 'SP' | 'P';
export type LanguageKey = 'EN' | 'JP';
export type ConditionKey = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';

export const CARD_TYPES: Record<CardTypeKey, string> = {
    Leader: 'Leader',
    Character: 'Character',
    Event: 'Event',
    Stage: 'Stage',
};

export const COLORS: Record<ColorKey, string> = {
    Red: 'Red',
    Green: 'Green',
    Blue: 'Blue',
    Purple: 'Purple',
    Black: 'Black',
    Yellow: 'Yellow',
};

export const ATTRIBUTES: Record<AttributeKey, string> = {
    Slash: 'Slash',
    Strike: 'Strike',
    Ranged: 'Ranged',
    Special: 'Special',
    Wisdom: 'Wisdom',
};

export const RARITIES: Record<RarityKey, string> = {
    L: 'Leader',
    C: 'Common',
    UC: 'Uncommon',
    R: 'Rare',
    SR: 'Super Rare',
    SEC: 'Secret Rare',
    SP: 'Special',
    P: 'Promo',
};

export const LANGUAGES: Record<LanguageKey, string> = {
    EN: 'English',
    JP: 'Japanese',
};

export const CONDITIONS: Record<ConditionKey, string> = {
    NM: 'Near Mint',
    LP: 'Lightly Played',
    MP: 'Moderately Played',
    HP: 'Heavily Played',
    DMG: 'Damaged',
};

export interface OpPrinting {
    id: number;
    op_card_id: number;
    op_set_id: number;
    external_id: string;
    collector_number: string;
    rarity: RarityKey | null;
    rarity_label?: string;
    is_alternate_art: boolean;
    language: LanguageKey;
    language_label?: string;
    image_url: string | null;
    card?: OpCard;
    set?: OpSet;
}

export interface OpInventory {
    id: number;
    user_id: number;
    lot_id: number;
    op_printing_id: number;
    condition: ConditionKey;
    condition_label?: string;
    language: LanguageKey;
    language_label?: string;
    price: number | null;
    position_in_lot: number;
    sold_at: string | null;
    sold_price: number | null;
    printing?: OpPrinting;
    lot?: {
        id: number;
        lot_number: string;
        box?: {
            id: number;
            name: string;
        };
    };
}

export interface OpCollection {
    id: number;
    user_id: number;
    op_printing_id: number;
    condition: ConditionKey;
    condition_label?: string;
    language: LanguageKey;
    language_label?: string;
    quantity: number;
    notes: string | null;
    source_lot_id: number | null;
    printing?: OpPrinting;
}

export interface OpCardFilters {
    search?: string;
    card_type?: string;
    color?: string;
    attribute?: string;
    cost?: number;
}

export interface OpPrintingFilters {
    search?: string;
    set?: number;
    rarity?: string;
    language?: string;
}

export interface OpInventoryFilters {
    search?: string;
    condition?: string;
    lot?: number;
    rarity?: string;
    card_type?: string;
    color?: string;
}

export interface OpCollectionFilters {
    search?: string;
    condition?: string;
    rarity?: string;
    card_type?: string;
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

export function getLanguageLabel(language: string | null): string {
    if (!language) return 'English';
    return LANGUAGES[language as LanguageKey] ?? language;
}

export function getConditionLabel(condition: string | null): string {
    if (!condition) return 'Unknown';
    return CONDITIONS[condition as ConditionKey] ?? condition;
}

export function getColorClass(color: ColorKey): string {
    const classes: Record<ColorKey, string> = {
        Red: 'bg-red-500',
        Green: 'bg-green-500',
        Blue: 'bg-blue-500',
        Purple: 'bg-purple-500',
        Black: 'bg-gray-800',
        Yellow: 'bg-yellow-500',
    };
    return classes[color] ?? 'bg-gray-400';
}

export function getCardTypeIcon(cardType: CardTypeKey): string {
    const icons: Record<CardTypeKey, string> = {
        Leader: 'crown',
        Character: 'user',
        Event: 'zap',
        Stage: 'map-pin',
    };
    return icons[cardType] ?? 'card';
}
