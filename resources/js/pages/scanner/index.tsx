import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';

import {
    ScannerCamera,
    ScannerSearch,
    ScannerPendingCards,
    ScannerCardEditor,
    ScannerLotSelector,
    ScannerInventoryList,
    ScannerSettings,
    ScannerBulkMode,
    type Game,
    type Lot,
    type Box,
    type CardMatch,
    type ScannedCard,
    type OllamaStatus,
    type PendingCard,
    type BulkModeSettings,
    type RecognitionResult,
    type ScannerFlash,
} from '@/components/scanner';
import { type ScannerSettings as ScannerSettingsType } from '@/components/scanner/types';

interface Props {
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
    scannerSettings: ScannerSettingsType;
    lotInventory: ScannedCard[];
    selectedLotId: number | null;
}

export default function ScannerIndex({
    games,
    selectedGame,
    lots,
    boxes,
    ollamaStatus,
    conditions,
    foilings,
    languages,
    searchResults: initialSearchResults,
    searchQuery: initialSearchQuery,
    scannerSettings: initialSettings,
    lotInventory: initialLotInventory,
    selectedLotId: initialSelectedLotId,
}: Props) {
    const { props } = usePage<{ flash?: { scanner?: ScannerFlash } }>();
    const flash = props.flash?.scanner;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Scanner',
            href: '/scanner',
        },
    ];

    // Lot state
    const [selectedLotId, setSelectedLotId] = useState<number | null>(initialSelectedLotId ?? lots[0]?.id ?? null);
    const [creatingLot, setCreatingLot] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [searchResults, setSearchResults] = useState<CardMatch[]>(initialSearchResults);
    const [searching, setSearching] = useState(false);

    // Selected card state
    const [selectedCondition, setSelectedCondition] = useState<string>(initialSettings.bulkMode.defaultCondition);
    const [selectedFoiling, setSelectedFoiling] = useState<string | null>(initialSettings.bulkMode.defaultFoiling);
    const [selectedLanguage, setSelectedLanguage] = useState<string>(initialSettings.bulkMode.defaultLanguage);

    // Recognition state
    const [recognizing, setRecognizing] = useState(false);
    const [notFoundRecognition, setNotFoundRecognition] = useState<RecognitionResult | null>(null);

    // Scanned cards in current lot
    const [scannedCards, setScannedCards] = useState<ScannedCard[]>(initialLotInventory);
    const [lotCardCount, setLotCardCount] = useState(initialLotInventory.length);

    // Bulk mode state
    const [bulkMode, setBulkMode] = useState<BulkModeSettings>(initialSettings.bulkMode);
    const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
    const [replacingCardId, setReplacingCardId] = useState<string | null>(null);
    const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
    const [confirmingAll, setConfirmingAll] = useState(false);

    // Update search results when props change
    useEffect(() => {
        setSearchResults(initialSearchResults);
        setSearching(false);
    }, [initialSearchResults]);

    // Update scanned cards when lot inventory changes
    useEffect(() => {
        setScannedCards(initialLotInventory);
        setLotCardCount(initialLotInventory.length);
    }, [initialLotInventory]);

    // Get the currently editing pending card
    const editingPendingCard = editingPendingId ? pendingCards.find((p) => p.id === editingPendingId) ?? null : null;

    // Handle flash messages from backend
    useEffect(() => {
        if (!flash) return;

        if (flash.match) {
            setNotFoundRecognition(null);
            const newPendingCard: PendingCard = {
                id: replacingCardId ?? `pending-${Date.now()}`,
                card: flash.match,
                condition: bulkMode.defaultCondition,
                foiling: bulkMode.defaultFoiling,
                language: bulkMode.defaultLanguage,
                capturedAt: new Date(),
            };

            if (replacingCardId) {
                setPendingCards((prev) => prev.map((p) => (p.id === replacingCardId ? newPendingCard : p)));
                setReplacingCardId(null);
            } else {
                setPendingCards((prev) => [newPendingCard, ...prev]);
            }
        } else if (flash.alternatives?.length) {
            setNotFoundRecognition(null);
            setSearchResults(flash.alternatives);
        } else if (flash.success && flash.recognition) {
            setNotFoundRecognition(flash.recognition);
        }

        if (flash.confirmed) {
            // Don't optimistically add to scannedCards - initialLotInventory already contains the new card
            // and will be synced via the other useEffect. Only update the count and show toast.
            if (flash.lot_count) setLotCardCount(flash.lot_count);
            toast.success(`${flash.confirmed.card_name} hinzugefügt`, {
                description: `Position ${flash.confirmed.position} · ${flash.confirmed.condition}${flash.confirmed.is_custom ? ' · Custom' : ''}`,
            });
        }

        if (flash.newLot) {
            setSelectedLotId(flash.newLot.id);
            setCreatingLot(false);
        }

        if (flash.error) {
            console.error('Scanner error:', flash.error);
            setRecognizing(false);
        }
    }, [flash, bulkMode, replacingCardId]);

    // Game switching
    const handleGameChange = (gameSlug: string) => {
        router.get('/scanner', { game: gameSlug }, { preserveState: false });
    };

    // Search
    const debouncedSearch = useDebouncedCallback((query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        router.get(
            '/scanner',
            { game: selectedGame.slug, q: query, lot_id: selectedLotId },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['searchResults', 'searchQuery'],
            }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        debouncedSearch(value);
    };

    const handleSelectCard = (card: CardMatch) => {
        const newPendingCard: PendingCard = {
            id: `pending-${Date.now()}`,
            card,
            condition: selectedCondition,
            foiling: selectedFoiling,
            language: selectedLanguage,
            capturedAt: new Date(),
        };
        setPendingCards((prev) => [newPendingCard, ...prev]);
        setSearchQuery('');
        setSearchResults([]);
    };

    // Lot handling
    const handleSelectLot = (lotId: number) => {
        setSelectedLotId(lotId);
        router.get('/scanner', { game: selectedGame.slug, lot_id: lotId }, { preserveState: true, preserveScroll: true });
    };

    const handleCreateLot = (boxId: string | null, notes: string) => {
        setCreatingLot(true);
        router.post(
            '/scanner/lot',
            {
                game: selectedGame.slug,
                box_id: boxId,
                notes: notes || null,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['lots', 'flash'],
            }
        );
    };

    // Camera capture
    const handleCapture = (base64: string) => {
        setRecognizing(true);
        router.post(
            '/scanner/recognize',
            { game: selectedGame.slug, image: base64 },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setRecognizing(false),
            }
        );
    };

    const handleFileUpload = async (files: FileList) => {
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;

            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.readAsDataURL(file);
            });

            setRecognizing(true);
            router.post(
                '/scanner/recognize',
                { game: selectedGame.slug, image: base64 },
                {
                    preserveState: true,
                    preserveScroll: true,
                    onFinish: () => setRecognizing(false),
                }
            );
        }
    };

    // Pending cards management
    const updatePendingCardCondition = (id: string, condition: string) => {
        setPendingCards((prev) => prev.map((p) => (p.id === id ? { ...p, condition } : p)));
    };

    const updatePendingCardFoiling = (id: string, foiling: string | null) => {
        setPendingCards((prev) => prev.map((p) => (p.id === id ? { ...p, foiling } : p)));
    };

    const updatePendingCardLanguage = (id: string, language: string) => {
        setPendingCards((prev) => prev.map((p) => (p.id === id ? { ...p, language } : p)));
    };

    const removePendingCard = (id: string) => {
        setPendingCards((prev) => prev.filter((p) => p.id !== id));
    };

    const rescanPendingCard = (id: string) => {
        setReplacingCardId(id);
    };

    const confirmAllPendingCards = async () => {
        if (!selectedLotId || pendingCards.length === 0) return;

        setConfirmingAll(true);

        for (const pending of pendingCards) {
            const confirmData = {
                game: selectedGame.slug,
                lot_id: selectedLotId,
                condition: pending.condition,
                language: pending.language,
                printing_id: pending.card.id,
                is_custom: pending.card.is_custom ?? false,
            };

            await new Promise<void>((resolve) => {
                router.post('/scanner/confirm', confirmData as Record<string, unknown> as any, {
                    preserveState: true,
                    preserveScroll: true,
                    onFinish: () => resolve(),
                });
            });
        }

        setPendingCards([]);
        setConfirmingAll(false);
    };

    // Save settings
    const saveSettings = useCallback(
        (newBulkMode: BulkModeSettings) => {
            router.post(
                '/scanner/settings',
                { game: selectedGame.slug, bulkMode: newBulkMode } as any,
                {
                    preserveState: true,
                    preserveScroll: true,
                }
            );
        },
        [selectedGame.slug]
    );

    const handleBulkModeChange = (newBulkMode: BulkModeSettings) => {
        setBulkMode(newBulkMode);
        saveSettings(newBulkMode);
    };

    // Not found handling
    const handleManualSearch = (query: string) => {
        handleSearchChange(query);
        setNotFoundRecognition(null);
    };

    const handleCreateCustomCard = (recognition: RecognitionResult) => {
        // Navigate to custom cards page with prefilled data
        router.get('/custom-cards', {
            game: selectedGame.id,
            prefill_name: recognition.card_name,
            prefill_set: recognition.set_code,
            prefill_number: recognition.collector_number,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Scanner - ${selectedGame.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Kartenscanner</h1>
                        <p className="text-muted-foreground">Scanne Karten für dein Inventar</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={selectedGame.slug} onValueChange={handleGameChange}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Spiel wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {games.map((game) => (
                                    <SelectItem key={game.id} value={game.slug}>
                                        {game.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {ollamaStatus.available ? (
                            <Badge variant="outline" className="gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                KI bereit
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                KI nicht verfügbar
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Left: Lot Selection, Search & Camera */}
                    <div className="space-y-4">
                        <ScannerLotSelector
                            lots={lots}
                            boxes={boxes}
                            selectedLotId={selectedLotId}
                            onSelectLot={handleSelectLot}
                            onCreateLot={handleCreateLot}
                            creatingLot={creatingLot}
                        />

                        <ScannerSearch
                            searchQuery={searchQuery}
                            searchResults={searchResults}
                            searching={searching}
                            onSearchChange={handleSearchChange}
                            onSelectCard={handleSelectCard}
                        />

                        <ScannerSettings
                            selectedCondition={selectedCondition}
                            selectedFoiling={selectedFoiling}
                            selectedLanguage={selectedLanguage}
                            conditions={conditions}
                            foilings={foilings}
                            languages={languages}
                            onConditionChange={setSelectedCondition}
                            onFoilingChange={setSelectedFoiling}
                            onLanguageChange={setSelectedLanguage}
                        />

                        <ScannerCamera
                            ollamaStatus={ollamaStatus}
                            bulkMode={bulkMode}
                            pendingCardsCount={pendingCards.length}
                            recognizing={recognizing}
                            onCapture={handleCapture}
                            onFileUpload={handleFileUpload}
                        />

                        <ScannerBulkMode
                            bulkMode={bulkMode}
                            replacingCardId={replacingCardId}
                            onBulkModeChange={handleBulkModeChange}
                            onCancelReplacing={() => setReplacingCardId(null)}
                        />
                    </div>

                    {/* Right: Card Editor, Pending & Inventory */}
                    <div className="space-y-4">
                        <ScannerCardEditor
                            editingPendingCard={editingPendingCard}
                            notFoundRecognition={notFoundRecognition}
                            conditions={conditions}
                            foilings={foilings}
                            languages={languages}
                            onUpdateCondition={updatePendingCardCondition}
                            onUpdateFoiling={updatePendingCardFoiling}
                            onUpdateLanguage={updatePendingCardLanguage}
                            onRemovePending={removePendingCard}
                            onFinishEditing={() => setEditingPendingId(null)}
                            onManualSearch={handleManualSearch}
                            onCreateCustomCard={handleCreateCustomCard}
                            onCloseNotFound={() => setNotFoundRecognition(null)}
                        />

                        <ScannerPendingCards
                            pendingCards={pendingCards}
                            editingPendingId={editingPendingId}
                            replacingCardId={replacingCardId}
                            confirmingAll={confirmingAll}
                            selectedLotId={selectedLotId}
                            conditions={conditions}
                            foilings={foilings}
                            languages={languages}
                            onEditPending={setEditingPendingId}
                            onUpdateCondition={updatePendingCardCondition}
                            onUpdateFoiling={updatePendingCardFoiling}
                            onUpdateLanguage={updatePendingCardLanguage}
                            onRescan={rescanPendingCard}
                            onRemove={removePendingCard}
                            onConfirmAll={confirmAllPendingCards}
                            onClear={() => setPendingCards([])}
                        />

                        <ScannerInventoryList scannedCards={scannedCards} lotCardCount={lotCardCount} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
