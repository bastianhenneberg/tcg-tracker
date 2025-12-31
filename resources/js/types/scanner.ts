import { type Box, type ConditionKey, type Lot } from './inventory';

export interface OllamaStatus {
    available: boolean;
    host: string;
    model: string;
}

export interface RecognitionResult {
    game: string | null;
    card_name: string | null;
    set_code: string | null;
    collector_number: string | null;
    foiling: string | null;
}

export interface CardMatch {
    id: number;
    card_name: string;
    set_name: string;
    collector_number: string;
    rarity: string | null;
    foiling: string | null;
    image_url: string | null;
}

export interface RecognizeResponse {
    success: boolean;
    recognition?: RecognitionResult;
    match?: CardMatch | null;
    confidence?: 'high' | 'medium' | 'low' | 'none';
    alternatives?: CardMatch[];
    error?: string;
}

export interface SearchResponse {
    results: CardMatch[];
}

export interface ConfirmResponse {
    success: boolean;
    inventory_card?: {
        id: number;
        card_name: string;
        position: number;
        condition: ConditionKey;
    };
    lot_count?: number;
}

export interface CreateLotResponse {
    success: boolean;
    lot?: {
        id: number;
        lot_number: number;
        box_name: string | null;
        created_at: string;
    };
}

export interface ScanPageProps {
    lots: Lot[];
    boxes: Box[];
    ollamaStatus: OllamaStatus;
    conditions: Record<ConditionKey, string>;
}

export interface ScannedCard {
    id: number;
    card_name: string;
    position: number;
    condition: ConditionKey;
}
