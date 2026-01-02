export interface RiftboundSet {
    id: number;
    code: string;
    name: string;
    release_date: string | null;
}

export interface RiftboundCard {
    id: number;
    external_id: string;
    name: string;
    types: string[];
    domains: string[];
    energy: number | null;
    power: number | null;
    functional_text: string | null;
    illustrators: string[];
    printings?: RiftboundPrinting[];
}

export type RiftboundRarityKey = 'C' | 'U' | 'R' | 'E' | 'O' | 'P';
export type RiftboundFoilingKey = 'N' | 'F' | 'O' | 'A';
export type RiftboundLanguageKey = 'EN';
export type RiftboundConditionKey = 'NM' | 'LP' | 'MP' | 'HP' | 'DM';

export const RIFTBOUND_RARITIES: Record<RiftboundRarityKey, string> = {
    C: 'Common',
    U: 'Uncommon',
    R: 'Rare',
    E: 'Epic',
    O: 'Overnumbered',
    P: 'Promo',
};

export const RIFTBOUND_FOILINGS: Record<RiftboundFoilingKey, string> = {
    N: 'Non-Foil',
    F: 'Foil',
    O: 'Overnumbered Foil',
    A: 'Alternate Art',
};

export const RIFTBOUND_LANGUAGES: Record<RiftboundLanguageKey, string> = {
    EN: 'English',
};

export const RIFTBOUND_CONDITIONS: Record<RiftboundConditionKey, string> = {
    NM: 'Near Mint',
    LP: 'Lightly Played',
    MP: 'Moderately Played',
    HP: 'Heavily Played',
    DM: 'Damaged',
};

export const RIFTBOUND_DOMAINS: Record<string, string> = {
    Fury: 'Fury',
    Calm: 'Calm',
    Mind: 'Mind',
    Body: 'Body',
    Chaos: 'Chaos',
    Order: 'Order',
};

export const RIFTBOUND_TYPES: Record<string, string> = {
    Champion: 'Champion',
    Spell: 'Spell',
    Ability: 'Ability',
    Item: 'Item',
    Landmark: 'Landmark',
};

export interface RiftboundPrinting {
    id: number;
    riftbound_card_id: number;
    riftbound_set_id: number;
    collector_number: string;
    rarity: RiftboundRarityKey | null;
    rarity_label?: string;
    foiling: RiftboundFoilingKey | null;
    foiling_label?: string;
    language: RiftboundLanguageKey;
    image_url: string | null;
    card?: RiftboundCard;
    set?: RiftboundSet;
}

export interface RiftboundInventory {
    id: number;
    user_id: number;
    lot_id: number;
    riftbound_printing_id: number;
    condition: RiftboundConditionKey;
    condition_label?: string;
    language: RiftboundLanguageKey;
    price: number | null;
    position_in_lot: number;
    sold_at: string | null;
    sold_price: number | null;
    printing?: RiftboundPrinting;
    lot?: {
        id: number;
        lot_number: string;
        box?: {
            id: number;
            name: string;
        };
    };
}

export interface RiftboundCollection {
    id: number;
    user_id: number;
    riftbound_printing_id: number;
    condition: RiftboundConditionKey;
    condition_label?: string;
    language: RiftboundLanguageKey;
    quantity: number;
    notes: string | null;
    source_lot_id: number | null;
    printing?: RiftboundPrinting;
}

export interface RiftboundCardFilters {
    search?: string;
    type?: string;
    domain?: string;
}

export interface RiftboundPrintingFilters {
    search?: string;
    set?: number;
    rarity?: string;
    foiling?: string;
}

export interface RiftboundInventoryFilters {
    search?: string;
    condition?: string;
    lot?: number;
    rarity?: string;
    foiling?: string;
}

export interface RiftboundCollectionFilters {
    search?: string;
    condition?: string;
    rarity?: string;
    foiling?: string;
    format?: string;
    playset?: string;
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
export function getRiftboundRarityLabel(rarity: string | null): string {
    if (!rarity) return 'Unknown';
    return RIFTBOUND_RARITIES[rarity as RiftboundRarityKey] ?? rarity;
}

export function getRiftboundFoilingLabel(foiling: string | null): string {
    if (!foiling) return 'Non-Foil';
    return RIFTBOUND_FOILINGS[foiling as RiftboundFoilingKey] ?? foiling;
}

export function getRiftboundConditionLabel(condition: string | null): string {
    if (!condition) return 'Unknown';
    return RIFTBOUND_CONDITIONS[condition as RiftboundConditionKey] ?? condition;
}

export function getDomainColor(domain: string | null): string {
    switch (domain) {
        case 'Fury':
            return 'text-red-500';
        case 'Calm':
            return 'text-blue-500';
        case 'Mind':
            return 'text-purple-500';
        case 'Body':
            return 'text-green-500';
        case 'Chaos':
            return 'text-orange-500';
        case 'Order':
            return 'text-yellow-500';
        default:
            return 'text-gray-500';
    }
}
