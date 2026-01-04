import { CardImage } from '@/components/card-image';
import { type CardMatch, type Game, type Lot, type Box, type RecentCard, type QuickAddFlash } from '@/components/quick-add/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';
import { Head, router, usePage } from '@inertiajs/react';
import { Keyboard, Layers, Plus, Search, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';

interface Props {
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

export default function QuickAddIndex({
    games,
    selectedGame,
    conditions,
    foilings,
    languages,
    lots,
    boxes,
    selectedLotId: initialLotId,
    recentCards: initialRecentCards,
    searchResults: initialSearchResults,
    searchQuery: initialSearchQuery,
    defaultCondition,
    defaultFoiling,
    defaultLanguage,
}: Props) {
    const { props } = usePage<{ flash?: { quickAdd?: QuickAddFlash } }>();
    const flash = props.flash?.quickAdd;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Quick Add', href: '/quick-add' },
    ];

    // Refs
    const searchInputRef = useRef<HTMLInputElement>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    // State
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [searchResults, setSearchResults] = useState<CardMatch[]>(initialSearchResults);
    const [searching, setSearching] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState(0);

    const [selectedCard, setSelectedCard] = useState<CardMatch | null>(null);
    const [selectedCondition, setSelectedCondition] = useState(defaultCondition);
    const [selectedFoiling, setSelectedFoiling] = useState<string | null>(defaultFoiling);
    const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);

    // Preset defaults that apply to all cards
    const [presetCondition, setPresetCondition] = useState(defaultCondition);
    const [presetFoiling, setPresetFoiling] = useState<string | null>(defaultFoiling);
    const [presetLanguage, setPresetLanguage] = useState(defaultLanguage);

    const [selectedLotId, setSelectedLotId] = useState<number | null>(
        initialLotId ? Number(initialLotId) : null
    );
    const [recentCards, setRecentCards] = useState<RecentCard[]>(initialRecentCards);
    const [confirming, setConfirming] = useState(false);

    const [showCreateLot, setShowCreateLot] = useState(false);
    const [newLotBoxId, setNewLotBoxId] = useState<string>('');

    // Condition keys for shortcuts
    const conditionKeys = Object.keys(conditions);

    // Debounced search
    const debouncedSearch = useDebouncedCallback((query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        router.get(
            '/quick-add',
            { game: selectedGame.slug, q: query, lot_id: selectedLotId },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['searchResults', 'searchQuery'],
                onSuccess: () => setSearching(false),
                onError: () => setSearching(false),
            }
        );
    }, 200);

    // Handle search input change
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setSelectedResultIndex(0);
        debouncedSearch(value);
    };

    // Handle card selection
    const handleSelectCard = (card: CardMatch) => {
        setSelectedCard(card);
        // Apply preset defaults
        setSelectedCondition(presetCondition);
        setSelectedLanguage(presetLanguage);
        // Use card's foiling if present, otherwise use preset
        setSelectedFoiling(card.foiling ?? presetFoiling);
        // Focus the confirm button so Enter confirms the card
        setTimeout(() => {
            confirmButtonRef.current?.focus();
        }, 0);
    };

    // Handle card confirmation
    const handleConfirm = useCallback(() => {
        if (!selectedCard || !selectedLotId || confirming) return;

        setConfirming(true);
        router.post(
            '/quick-add/confirm',
            {
                game: selectedGame.slug,
                lot_id: selectedLotId,
                printing_id: selectedCard.id,
                condition: selectedCondition,
                foiling: selectedFoiling,
                language: selectedLanguage,
                is_custom: selectedCard.is_custom ?? false,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setConfirming(false);
                    setSelectedCard(null);
                    setSearchQuery('');
                    setSearchResults([]);
                    searchInputRef.current?.focus();
                },
                onError: () => {
                    setConfirming(false);
                    toast.error('Fehler beim Hinzufügen');
                },
            }
        );
    }, [selectedCard, selectedLotId, selectedGame, selectedCondition, selectedFoiling, selectedLanguage, confirming]);

    // Handle cancel
    const handleCancel = () => {
        setSelectedCard(null);
        searchInputRef.current?.focus();
    };

    // Handle game change
    const handleGameChange = (gameSlug: string) => {
        router.get('/quick-add', { game: gameSlug }, { preserveState: false });
    };

    // Handle lot change
    const handleLotChange = (lotId: string) => {
        if (lotId === 'new') {
            setShowCreateLot(true);
            return;
        }
        setSelectedLotId(parseInt(lotId));
        router.get(
            '/quick-add',
            { game: selectedGame.slug, lot_id: lotId },
            { preserveState: true, only: ['recentCards', 'selectedLotId'] }
        );
    };

    // Handle create lot
    const handleCreateLot = () => {
        router.post(
            '/quick-add/lot',
            { box_id: newLotBoxId || null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowCreateLot(false);
                    setNewLotBoxId('');
                },
            }
        );
    };

    // Update search results when they change from server
    useEffect(() => {
        setSearchResults(initialSearchResults);
    }, [initialSearchResults]);

    // Update recent cards and show toast on flash
    useEffect(() => {
        if (flash?.success && flash.confirmed) {
            const newCard: RecentCard = {
                id: flash.confirmed.id,
                card_name: flash.confirmed.card_name,
                set_name: flash.confirmed.set_name,
                collector_number: flash.confirmed.collector_number,
                position: flash.confirmed.position,
                condition: flash.confirmed.condition,
                foiling: selectedFoiling,
                is_custom: flash.confirmed.is_custom,
            };
            setRecentCards((prev) => [newCard, ...prev.slice(0, 9)]);
            toast.success(`#${flash.confirmed.position} ${flash.confirmed.card_name} hinzugefügt`);
        }
        if (flash?.newLot) {
            setSelectedLotId(flash.newLot.id);
            setRecentCards([]);
            toast.success(`Lot #${flash.newLot.lot_number} erstellt`);
        }
    }, [flash]);

    // Auto-focus search input on mount
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // Keyboard navigation for search results
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedResultIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedResultIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && searchResults[selectedResultIndex]) {
            e.preventDefault();
            handleSelectCard(searchResults[selectedResultIndex]);
        }
    };

    // Global keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement;
            const isInSearchInput = activeElement === searchInputRef.current;
            const isInSelect = activeElement?.closest('[role="combobox"]') !== null;

            // Escape: Cancel selection or clear search
            if (e.key === 'Escape') {
                if (selectedCard) {
                    handleCancel();
                } else if (searchQuery) {
                    setSearchQuery('');
                    setSearchResults([]);
                }
                return;
            }

            // When card is selected, handle shortcuts
            if (selectedCard) {
                // Condition shortcuts 1-5
                if (['1', '2', '3', '4', '5'].includes(e.key) && !isInSelect) {
                    e.preventDefault();
                    const index = parseInt(e.key) - 1;
                    if (conditionKeys[index]) {
                        setSelectedCondition(conditionKeys[index]);
                    }
                    return;
                }

                // Enter: Confirm card (unless in select dropdown)
                if (e.key === 'Enter' && !confirming && !isInSelect) {
                    e.preventDefault();
                    handleConfirm();
                    return;
                }
            }

            // Don't process other shortcuts when in input or select
            if (isInSearchInput || isInSelect) return;

            // Ctrl+Enter: Quick confirm with defaults
            if (e.ctrlKey && e.key === 'Enter' && searchResults[selectedResultIndex] && !selectedCard) {
                e.preventDefault();
                const card = searchResults[selectedResultIndex];
                setSelectedCard(card);
                setTimeout(() => handleConfirm(), 0);
                return;
            }

            // Focus search with /
            if (e.key === '/' || e.key === 's') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [selectedCard, searchQuery, searchResults, selectedResultIndex, confirming, conditionKeys, handleConfirm]);

    const selectedLot = lots.find((l) => l.id === selectedLotId);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quick Add" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="flex items-center gap-2 text-xl font-bold">
                            <Keyboard className="h-5 w-5" />
                            Quick Add
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Game Switcher */}
                        <Select value={selectedGame.slug} onValueChange={handleGameChange}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {games.map((game) => (
                                    <SelectItem key={game.id} value={game.slug}>
                                        {game.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Lot Selector */}
                        <Select
                            value={selectedLotId?.toString() ?? ''}
                            onValueChange={handleLotChange}
                        >
                            <SelectTrigger className="w-[160px]">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4" />
                                    <span className="truncate">
                                        {selectedLot ? `Lot #${selectedLot.lot_number}` : 'Lot wählen'}
                                    </span>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">
                                    <div className="flex items-center gap-2">
                                        <Plus className="h-4 w-4" />
                                        Neues Lot
                                    </div>
                                </SelectItem>
                                {lots.map((lot) => (
                                    <SelectItem key={lot.id} value={lot.id.toString()}>
                                        Lot #{lot.lot_number}
                                        {lot.box && ` (${lot.box.name})`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Preset Defaults */}
                <Card className="border-dashed">
                    <CardContent className="flex flex-wrap items-center gap-4 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Settings2 className="h-4 w-4" />
                            Voreinstellungen:
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={presetCondition} onValueChange={setPresetCondition}>
                                <SelectTrigger className="h-8 w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(conditions).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {key}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {Object.keys(foilings).length > 0 && (
                                <Select
                                    value={presetFoiling ?? '_none'}
                                    onValueChange={(v) => setPresetFoiling(v === '_none' ? null : v)}
                                >
                                    <SelectTrigger className="h-8 w-[130px]">
                                        <SelectValue placeholder="Foiling" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">Kein Foiling</SelectItem>
                                        {Object.entries(foilings).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <Select value={presetLanguage} onValueChange={setPresetLanguage}>
                                <SelectTrigger className="h-8 w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(languages).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {key}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            Diese Werte werden für jede Karte voreingestellt
                        </span>
                    </CardContent>
                </Card>

                {/* Main Content */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Left: Search & Results */}
                    <div className="space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                            <Input
                                ref={searchInputRef}
                                className="pl-9 text-lg"
                                placeholder="Kartenname oder Nummer eingeben..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                            />
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <Card>
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {searchResults.map((card, index) => (
                                            <button
                                                key={card.id}
                                                className={cn(
                                                    'flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent',
                                                    index === selectedResultIndex && 'bg-accent'
                                                )}
                                                onClick={() => handleSelectCard(card)}
                                            >
                                                {card.image_url && (
                                                    <img
                                                        src={card.image_url}
                                                        alt=""
                                                        className="h-12 w-auto rounded"
                                                    />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium truncate">
                                                        {card.card_name}
                                                    </div>
                                                    <div className="text-muted-foreground text-sm truncate">
                                                        {card.collector_number} · {card.set_name}
                                                        {card.foiling_label && ` · ${card.foiling_label}`}
                                                    </div>
                                                </div>
                                                {index === selectedResultIndex && (
                                                    <span className="text-muted-foreground text-xs">
                                                        Enter
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Empty state */}
                        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                            <Card>
                                <CardContent className="py-8 text-center">
                                    <p className="text-muted-foreground">
                                        Keine Karten gefunden für "{searchQuery}"
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right: Selected Card & Recent */}
                    <div className="space-y-4">
                        {/* Selected Card Preview */}
                        {selectedCard ? (
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex gap-4">
                                        {selectedCard.image_url && (
                                            <CardImage
                                                src={selectedCard.image_url}
                                                alt={selectedCard.card_name}
                                                className="h-32 w-auto rounded-lg"
                                            />
                                        )}
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h3 className="text-lg font-semibold">
                                                    {selectedCard.card_name}
                                                </h3>
                                                <p className="text-muted-foreground text-sm">
                                                    {selectedCard.collector_number} · {selectedCard.set_name}
                                                </p>
                                            </div>

                                            {/* Condition Buttons */}
                                            <div className="space-y-2">
                                                <Label className="text-xs">Condition</Label>
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.entries(conditions).map(([key, label], index) => (
                                                        <Button
                                                            key={key}
                                                            variant={selectedCondition === key ? 'default' : 'outline'}
                                                            size="sm"
                                                            onClick={() => setSelectedCondition(key)}
                                                            className="min-w-[60px]"
                                                        >
                                                            <span className="text-muted-foreground mr-1 text-xs">
                                                                {index + 1}
                                                            </span>
                                                            {key}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Foiling & Language */}
                                            <div className="flex gap-2">
                                                {Object.keys(foilings).length > 0 && (
                                                    <Select
                                                        value={selectedFoiling ?? '_none'}
                                                        onValueChange={(v) => setSelectedFoiling(v === '_none' ? null : v)}
                                                    >
                                                        <SelectTrigger className="w-[140px]">
                                                            <SelectValue placeholder="Foiling" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="_none">Kein Foiling</SelectItem>
                                                            {Object.entries(foilings).map(([key, label]) => (
                                                                <SelectItem key={key} value={key}>
                                                                    {label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                <Select
                                                    value={selectedLanguage}
                                                    onValueChange={setSelectedLanguage}
                                                >
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue placeholder="Sprache" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(languages).map(([key, label]) => (
                                                            <SelectItem key={key} value={key}>
                                                                {label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <Button
                                                    ref={confirmButtonRef}
                                                    onClick={handleConfirm}
                                                    disabled={confirming || !selectedLotId}
                                                    className="flex-1"
                                                >
                                                    {confirming ? 'Hinzufügen...' : 'Hinzufügen'}
                                                    <span className="ml-2 text-xs opacity-70">Enter</span>
                                                </Button>
                                                <Button variant="outline" onClick={handleCancel}>
                                                    Abbrechen
                                                    <span className="ml-2 text-xs opacity-70">Esc</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="py-8 text-center">
                                    <Keyboard className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                                    <p className="text-muted-foreground">
                                        Suche nach einer Karte und wähle sie mit Enter aus
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recent Cards */}
                        {recentCards.length > 0 && (
                            <Card>
                                <CardContent className="p-4">
                                    <h4 className="mb-3 text-sm font-medium">
                                        Zuletzt hinzugefügt ({recentCards.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {recentCards.map((card) => (
                                            <div
                                                key={card.id}
                                                className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-muted-foreground mr-2">
                                                        #{card.position}
                                                    </span>
                                                    <span className="font-medium">{card.card_name}</span>
                                                </div>
                                                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                                    <span>{card.condition}</span>
                                                    {card.foiling && <span>{card.foiling}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Keyboard Hints */}
                <div className="bg-muted/50 mt-auto flex flex-wrap items-center justify-center gap-4 rounded-lg p-3 text-xs">
                    <span className="text-muted-foreground">
                        <kbd className="bg-background rounded border px-1.5 py-0.5">↑↓</kbd> Navigation
                    </span>
                    <span className="text-muted-foreground">
                        <kbd className="bg-background rounded border px-1.5 py-0.5">Enter</kbd> Auswählen/Bestätigen
                    </span>
                    <span className="text-muted-foreground">
                        <kbd className="bg-background rounded border px-1.5 py-0.5">1-5</kbd> Condition
                    </span>
                    <span className="text-muted-foreground">
                        <kbd className="bg-background rounded border px-1.5 py-0.5">Esc</kbd> Abbrechen
                    </span>
                    <span className="text-muted-foreground">
                        <kbd className="bg-background rounded border px-1.5 py-0.5">/</kbd> Suche fokussieren
                    </span>
                </div>
            </div>

            {/* Create Lot Dialog */}
            <Dialog open={showCreateLot} onOpenChange={setShowCreateLot}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Neues Lot erstellen</DialogTitle>
                        <DialogDescription>
                            Erstelle ein neues Lot für deine Karten.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Karton (optional)</Label>
                            <Select value={newLotBoxId} onValueChange={setNewLotBoxId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Kein Karton" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Kein Karton</SelectItem>
                                    {boxes.map((box) => (
                                        <SelectItem key={box.id} value={box.id.toString()}>
                                            {box.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateLot(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleCreateLot}>Lot erstellen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
