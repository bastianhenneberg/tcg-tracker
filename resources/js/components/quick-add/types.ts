/**
 * Quick Add Types
 * Used by the keyboard-optimized quick add page
 */

export interface Game {
    id: number;
    name: string;
    slug: string;
    is_official: boolean;
}

export interface Box {
    id: number;
    name: string;
}

export interface Lot {
    id: number;
    lot_number: string;
    box?: Box;
}

export interface CardMatch {
    id: number;
    card_name: string;
    set_name: string;
    collector_number: string;
    rarity: string | null;
    rarity_label?: string;
    foiling: string | null;
    foiling_label?: string;
    image_url: string | null;
    is_custom?: boolean;
}

export interface RecentCard {
    id: number;
    card_name: string;
    set_name: string;
    collector_number: string;
    position: number;
    condition: string;
    foiling: string | null;
    is_custom: boolean;
}

export interface QuickAddFlash {
    success: boolean;
    error?: string;
    confirmed?: {
        id: number;
        card_name: string;
        set_name: string;
        collector_number: string;
        position: number;
        condition: string;
        is_custom: boolean;
    };
    newLot?: {
        id: number;
        lot_number: string;
        box_name?: string;
    };
}

export interface QuickAddProps {
    games: Game[];
    selectedGame: Game;
    conditions: Record<string, string>;
    foilings: Record<string, string>;
    languages: Record<string, string>;
    lots: Lot[];
    boxes: Box[];
    selectedLotId: number | null;
    recentCards: RecentCard[];
    searchResults: CardMatch[];
    searchQuery: string;
    defaultCondition: string;
    defaultFoiling: string | null;
    defaultLanguage: string;
}
