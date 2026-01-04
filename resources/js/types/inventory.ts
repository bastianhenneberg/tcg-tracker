import { type CardPrinting } from './cards';

export interface Box {
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    lots_count?: number;
    lots?: Lot[];
}

export interface UnifiedInventoryItem {
    id: number;
    user_id: number;
    lot_id: number | null;
    printing_id: number;
    condition: ConditionKey;
    language: string;
    quantity: number;
    in_collection: boolean;
    extra: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    printing?: {
        id: number;
        card_id: number;
        collector_number: string;
        set_name: string | null;
        set_code: string | null;
        rarity: string | null;
        rarity_label: string | null;
        finish: string | null;
        finish_label: string | null;
        image_url: string | null;
        card: {
            id: number;
            name: string;
            game: string;
        };
        set?: {
            id: number;
            name: string;
            code: string;
        };
    };
}

export interface Lot {
    id: number;
    user_id: number;
    box_id: number;
    lot_number: number;
    card_range_start: number | null;
    card_range_end: number | null;
    scanned_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    box?: Box;
    inventory_items_count?: number;
    inventory_items?: UnifiedInventoryItem[];
}

export interface InventoryCard {
    id: number;
    user_id: number;
    lot_id: number;
    card_printing_id: number;
    condition: ConditionKey;
    price: number | null;
    position_in_lot: number;
    sold_at: string | null;
    sold_price: number | null;
    created_at: string;
    updated_at: string;
    lot?: Lot;
    card_printing?: CardPrinting;
}

export interface CollectionCard {
    id: number;
    user_id: number;
    card_printing_id: number;
    condition: string;
    quantity: number;
    source_lot_id: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    card_printing?: CardPrinting;
    source_lot?: Lot;
}

export type ConditionKey = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';

export const CONDITIONS: Record<ConditionKey, string> = {
    NM: 'Near Mint',
    LP: 'Lightly Played',
    MP: 'Moderately Played',
    HP: 'Heavily Played',
    DMG: 'Damaged',
};

export interface InventoryFilters {
    search?: string;
    condition?: ConditionKey;
    lot?: number;
}

export interface InventoryStats {
    total: number;
    sold: number;
}

export interface CollectionStats {
    unique_cards: number;
    total_cards: number;
}
