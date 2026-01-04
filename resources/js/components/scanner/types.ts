/**
 * Unified Scanner Types
 * Used by the unified scanner page for all games
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

export interface ScannedCard {
    id: number;
    card_name: string;
    position: number;
    condition: string;
    is_custom?: boolean;
}

export interface RecognitionResult {
    card_name?: string;
    set_code?: string;
    collector_number?: string;
    foiling?: string;
}

export interface ScannerFlash {
    success: boolean;
    error?: string;
    recognition?: RecognitionResult;
    match?: CardMatch;
    alternatives?: CardMatch[];
    confirmed?: ScannedCard;
    lot_count?: number;
    newLot?: { id: number; lot_number: string; box_name?: string };
}

export interface BulkModeSettings {
    enabled: boolean;
    interval: number;
    defaultCondition: string;
    defaultFoiling: string | null;
    defaultLanguage: string;
}

export interface PendingCard {
    id: string;
    card: CardMatch;
    condition: string;
    foiling: string | null;
    language: string;
    capturedAt: Date;
}

export interface ScannerSettings {
    bulkMode: BulkModeSettings;
}

export interface OllamaStatus {
    available: boolean;
    model: string | null;
}

export interface CameraCapabilities {
    zoom?: { min: number; max: number; step: number };
    focusMode?: string[];
    focusDistance?: { min: number; max: number; step: number };
    exposureMode?: string[];
    exposureTime?: { min: number; max: number; step: number };
    brightness?: { min: number; max: number; step: number };
    contrast?: { min: number; max: number; step: number };
    sharpness?: { min: number; max: number; step: number };
    saturation?: { min: number; max: number; step: number };
    torch?: boolean;
}

export interface CameraSettings {
    zoom: number;
    focusMode: string;
    focusDistance: number;
    exposureMode: string;
    exposureTime: number;
    brightness: number;
    contrast: number;
    sharpness: number;
    saturation: number;
    torch: boolean;
}

export interface ScannerPageProps {
    games: Game[];
    selectedGame: Game;
    lots: Lot[];
    boxes: Box[];
    ollamaStatus: OllamaStatus;
    conditions: Record<string, string>;
    foilings: Record<string, string>;
    languages: Record<string, string>;
    searchResults: CardMatch[];
    searchQuery: string;
    scannerSettings: ScannerSettings;
    lotInventory: ScannedCard[];
    selectedLotId: number | null;
}
