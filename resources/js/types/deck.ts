// Deck Types for Deckbuilder

import { Game, UnifiedPrinting } from './unified';

export interface GameFormat {
    id: number;
    game_id: number;
    slug: string;
    name: string;
    description?: string;
    is_active: boolean;
    sort_order: number;
    game?: Game;
    created_at: string;
    updated_at: string;
}

export interface Deck {
    id: number;
    user_id: number;
    game_format_id: number;
    name: string;
    description?: string;
    is_public: boolean;
    use_collection_only: boolean;
    metadata?: Record<string, unknown>;
    game_format?: GameFormat;
    cards_count?: number;
    created_at: string;
    updated_at: string;
}

export interface DeckZone {
    id: number;
    game_format_id: number;
    slug: string;
    name: string;
    min_cards: number;
    max_cards: number | null;
    is_required: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface DeckCard {
    id: number;
    deck_id: number;
    deck_zone_id: number;
    printing_id: number;
    quantity: number;
    position: number;
    printing?: UnifiedPrinting;
    zone?: DeckZone;
    created_at: string;
    updated_at: string;
}

export interface DeckZoneWithCards {
    zone: DeckZone;
    cards: DeckCard[];
    count: number;
}

export interface DeckStatistics {
    total_cards: number;
    mana_curve: Record<number, number>;
    type_distribution: Record<string, number>;
    color_distribution: Record<string, number>;
    zones: Record<string, number>;
}

export interface ValidationError {
    type: 'zone_minimum' | 'zone_maximum' | 'playset_exceeded' | 'collection_shortage';
    message: string;
    zone?: string;
    card?: string;
    count?: number;
    max?: number;
    needed?: number;
    owned?: number;
}

export interface DeckValidation {
    valid: boolean;
    errors: ValidationError[];
}

export interface DeckBuilderResponse {
    success: boolean;
    deckCard?: DeckCard;
    validation: DeckValidation;
    statistics: DeckStatistics;
}

export interface CardSearchResult {
    data: UnifiedPrinting[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}
