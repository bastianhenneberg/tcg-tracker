import { type CardPrinting } from './cards';
import { type FabInventory } from './fab';

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
    fab_inventory_items_count?: number;
    fab_inventory_items?: FabInventory[];
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
