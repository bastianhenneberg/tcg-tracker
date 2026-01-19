import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    Deck,
    DeckBuilderResponse,
    DeckCard,
    DeckStatistics,
    DeckValidation,
    DeckZone,
    DeckZoneWithCards,
} from '@/types/deck';
import { Game, UnifiedPrinting } from '@/types/unified';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, Download, Minus, Plus, Search, Trash2, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';

// Helper to get CSRF token from cookie
function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

// Draggable card component
function DraggableCard({ card, children }: { card: DeckCard; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id,
    });

    const style = transform
        ? {
              transform: CSS.Translate.toString(transform),
              opacity: isDragging ? 0.5 : 1,
          }
        : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            {children}
        </div>
    );
}

// Droppable zone component
function DroppableZone({ zoneSlug, children }: { zoneSlug: string; children: React.ReactNode }) {
    const { isOver, setNodeRef } = useDroppable({
        id: zoneSlug,
    });

    return (
        <div
            ref={setNodeRef}
            className={`min-h-[80px] py-2 transition-colors ${isOver ? 'bg-primary/10 rounded' : ''}`}
        >
            {children}
        </div>
    );
}

interface Props {
    game: Game;
    deck: Deck;
    zones: DeckZone[];
    deckCards: DeckZoneWithCards[];
    validation: DeckValidation;
    statistics: DeckStatistics;
}

export default function DeckBuilder({ game, deck, zones, deckCards: initialDeckCards, validation: initialValidation, statistics: initialStatistics }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UnifiedPrinting[]>([]);
    const [searching, setSearching] = useState(false);
    const [deckCards, setDeckCards] = useState(initialDeckCards);
    const [validation, setValidation] = useState(initialValidation);
    const [statistics, setStatistics] = useState(initialStatistics);
    const [activeCard, setActiveCard] = useState<DeckCard | null>(null);
    const [selectedZone, setSelectedZone] = useState<string>(zones[0]?.slug || 'main');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/g/${game.slug}/inventory` },
        { title: 'Decks', href: `/g/${game.slug}/decks` },
        { title: deck.name, href: `/g/${game.slug}/decks/${deck.id}` },
        { title: 'Builder', href: `/g/${game.slug}/decks/${deck.id}/builder` },
    ];

    // Search for cards
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const response = await fetch(
                `/g/${game.slug}/decks/${deck.id}/search?q=${encodeURIComponent(searchQuery)}&per_page=50`
            );
            const data = await response.json();
            setSearchResults(data.data || []);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setSearching(false);
        }
    }, [game.slug, deck.id, searchQuery]);

    // Add card to deck
    const handleAddCard = async (printing: UnifiedPrinting) => {
        try {
            const response = await fetch(`/g/${game.slug}/decks/${deck.id}/cards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    printing_id: printing.id,
                    zone: selectedZone,
                    quantity: 1,
                }),
            });

            const data: DeckBuilderResponse = await response.json();
            if (data.success) {
                updateLocalState(data);
            }
        } catch (error) {
            console.error('Add card failed:', error);
        }
    };

    // Remove card from deck
    const handleRemoveCard = async (card: DeckCard) => {
        try {
            const response = await fetch(`/g/${game.slug}/decks/${deck.id}/cards/${card.id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
            });

            const data: DeckBuilderResponse = await response.json();
            if (data.success) {
                // Remove card from local state
                setDeckCards((prev) =>
                    prev.map((zc) => ({
                        ...zc,
                        cards: zc.cards.filter((c) => c.id !== card.id),
                        count: zc.cards.filter((c) => c.id !== card.id).reduce((sum, c) => sum + c.quantity, 0),
                    }))
                );
                setValidation(data.validation);
                setStatistics(data.statistics);
            }
        } catch (error) {
            console.error('Remove card failed:', error);
        }
    };

    // Update card quantity
    const handleQuantityChange = async (card: DeckCard, delta: number) => {
        const newQty = card.quantity + delta;
        if (newQty < 0) return;

        try {
            const response = await fetch(`/g/${game.slug}/decks/${deck.id}/cards/${card.id}/quantity`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ quantity: newQty }),
            });

            const data: DeckBuilderResponse = await response.json();
            if (data.success) {
                if (newQty === 0) {
                    // Remove card
                    setDeckCards((prev) =>
                        prev.map((zc) => ({
                            ...zc,
                            cards: zc.cards.filter((c) => c.id !== card.id),
                            count: zc.cards.filter((c) => c.id !== card.id).reduce((sum, c) => sum + c.quantity, 0),
                        }))
                    );
                } else {
                    // Update quantity
                    setDeckCards((prev) =>
                        prev.map((zc) => ({
                            ...zc,
                            cards: zc.cards.map((c) => (c.id === card.id ? { ...c, quantity: newQty } : c)),
                            count: zc.cards.map((c) => (c.id === card.id ? newQty : c.quantity)).reduce((a, b) => a + b, 0),
                        }))
                    );
                }
                setValidation(data.validation);
                setStatistics(data.statistics);
            }
        } catch (error) {
            console.error('Quantity update failed:', error);
        }
    };

    // Handle drag start
    const handleDragStart = (event: DragStartEvent) => {
        const cardId = event.active.id as number;
        for (const zc of deckCards) {
            const card = zc.cards.find((c) => c.id === cardId);
            if (card) {
                setActiveCard(card);
                break;
            }
        }
    };

    // Handle drag end
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCard(null);

        if (!over || !active) return;

        const cardId = active.id as number;
        const targetZoneSlug = over.id as string;

        // Find the card and its current zone
        let sourceZoneSlug = '';
        for (const zc of deckCards) {
            if (zc.cards.find((c) => c.id === cardId)) {
                sourceZoneSlug = zc.zone.slug;
                break;
            }
        }

        // Don't do anything if dropped on same zone
        if (sourceZoneSlug === targetZoneSlug) return;

        try {
            const response = await fetch(`/g/${game.slug}/decks/${deck.id}/cards/${cardId}/move`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ target_zone: targetZoneSlug }),
            });

            const data: DeckBuilderResponse = await response.json();
            if (data.success && data.deckCard) {
                // Move card in local state
                setDeckCards((prev) => {
                    const newState = prev.map((zc) => ({
                        ...zc,
                        cards: zc.cards.filter((c) => c.id !== cardId),
                        count: 0,
                    }));

                    // Add to target zone
                    const targetIdx = newState.findIndex((zc) => zc.zone.slug === targetZoneSlug);
                    if (targetIdx >= 0) {
                        newState[targetIdx].cards.push(data.deckCard!);
                    }

                    // Recalculate counts
                    return newState.map((zc) => ({
                        ...zc,
                        count: zc.cards.reduce((sum, c) => sum + c.quantity, 0),
                    }));
                });
                setValidation(data.validation);
                setStatistics(data.statistics);
            }
        } catch (error) {
            console.error('Move card failed:', error);
        }
    };

    // Update local state from API response
    const updateLocalState = (data: DeckBuilderResponse) => {
        if (data.deckCard) {
            setDeckCards((prev) => {
                const newState = [...prev];
                const zoneIdx = newState.findIndex((zc) => zc.zone.id === data.deckCard?.deck_zone_id);
                if (zoneIdx >= 0) {
                    const existingIdx = newState[zoneIdx].cards.findIndex((c) => c.id === data.deckCard?.id);
                    if (existingIdx >= 0) {
                        newState[zoneIdx].cards[existingIdx] = data.deckCard;
                    } else {
                        newState[zoneIdx].cards.push(data.deckCard);
                    }
                    newState[zoneIdx].count = newState[zoneIdx].cards.reduce((sum, c) => sum + c.quantity, 0);
                }
                return newState;
            });
        }
        setValidation(data.validation);
        setStatistics(data.statistics);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${deck.name} Builder - ${game.name}`} />

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href={`/g/${game.slug}/decks/${deck.id}`}>
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold">{deck.name}</h1>
                                <p className="text-muted-foreground text-sm">{deck.game_format?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {validation.valid ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className="text-sm">{statistics.total_cards} Karten</span>
                            <a href={`/g/${game.slug}/decks/${deck.id}/export/txt`} download>
                                <Button variant="outline" size="sm">
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* Main 3-Column Layout */}
                    <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
                        {/* Search Panel */}
                        <Card className="col-span-4 flex flex-col overflow-hidden">
                            <CardHeader className="py-3">
                                <CardTitle className="text-lg">Karten suchen</CardTitle>
                            </CardHeader>
                            <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Kartenname..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                    <Button onClick={handleSearch} disabled={searching}>
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex gap-1">
                                    {zones.map((zone) => (
                                        <Button
                                            key={zone.slug}
                                            variant={selectedZone === zone.slug ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setSelectedZone(zone.slug)}
                                        >
                                            {zone.name}
                                        </Button>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-auto">
                                    <div className="grid grid-cols-2 gap-2">
                                        {searchResults.map((printing) => (
                                            <div
                                                key={printing.id}
                                                className="cursor-pointer overflow-hidden rounded border transition-colors hover:border-primary"
                                                onClick={() => handleAddCard(printing)}
                                            >
                                                {printing.image_url_small || printing.image_url ? (
                                                    <img
                                                        src={printing.image_url_small || printing.image_url}
                                                        alt={printing.card?.name}
                                                        className="aspect-[2.5/3.5] w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="bg-muted flex aspect-[2.5/3.5] w-full items-center justify-center p-2 text-center text-xs">
                                                        {printing.card?.name}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Deck Zones */}
                        <div className="col-span-5 flex flex-col gap-3 overflow-auto">
                            {deckCards.map(({ zone, cards, count }) => (
                                <Card key={zone.id} className="shrink-0">
                                    <CardHeader className="py-2">
                                        <CardTitle className="flex items-center justify-between text-base">
                                            <span>{zone.name}</span>
                                            <span
                                                className={`text-sm font-normal ${
                                                    zone.is_required && count < zone.min_cards
                                                        ? 'text-red-500'
                                                        : zone.max_cards && count > zone.max_cards
                                                          ? 'text-red-500'
                                                          : 'text-muted-foreground'
                                                }`}
                                            >
                                                {count}
                                                {zone.min_cards > 0 && `/${zone.min_cards}`}
                                                {zone.max_cards && zone.min_cards !== zone.max_cards && `-${zone.max_cards}`}
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <DroppableZone zoneSlug={zone.slug}>
                                            <div className="px-6">
                                                {cards.length === 0 ? (
                                                    <p className="text-muted-foreground text-sm">
                                                        Karten hierher ziehen
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {cards.map((card) => (
                                                            <DraggableCard key={card.id} card={card}>
                                                                <div className="flex cursor-grab items-center gap-2 rounded border bg-background p-1.5 text-sm active:cursor-grabbing">
                                                                    <div className="flex items-center gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleQuantityChange(card, -1);
                                                                            }}
                                                                        >
                                                                            <Minus className="h-3 w-3" />
                                                                        </Button>
                                                                        <span className="w-4 text-center">{card.quantity}</span>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleQuantityChange(card, 1);
                                                                            }}
                                                                        >
                                                                            <Plus className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                    <span className="flex-1 truncate">
                                                                        {card.printing?.card?.name}
                                                                    </span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-destructive h-6 w-6"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveCard(card);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </DraggableCard>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </DroppableZone>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Stats & Validation Panel */}
                        <div className="col-span-3 flex flex-col gap-3 overflow-auto">
                            {/* Validation */}
                            <Card>
                                <CardHeader className="py-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        {validation.valid ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        Validierung
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-2">
                                    {validation.valid ? (
                                        <p className="text-sm text-green-600">Deck ist gültig</p>
                                    ) : (
                                        <ul className="space-y-1">
                                            {validation.errors.map((error, i) => (
                                                <li key={i} className="text-sm text-red-600">
                                                    {error.message}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Statistics */}
                            <Card className="flex-1">
                                <CardHeader className="py-2">
                                    <CardTitle className="text-base">Statistiken</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 py-2">
                                    <div>
                                        <p className="text-muted-foreground text-xs">Karten gesamt</p>
                                        <p className="text-xl font-bold">{statistics.total_cards}</p>
                                    </div>

                                    {Object.keys(statistics.mana_curve).length > 0 && (
                                        <div>
                                            <p className="text-muted-foreground mb-1 text-xs">Manakurve</p>
                                            <div className="flex items-end gap-1">
                                                {Object.entries(statistics.mana_curve).map(([cost, count]) => {
                                                    const maxCount = Math.max(...Object.values(statistics.mana_curve));
                                                    const height = Math.max((count / maxCount) * 40, 4);
                                                    return (
                                                        <div key={cost} className="flex flex-col items-center">
                                                            <div
                                                                className="bg-primary w-4 rounded-t"
                                                                style={{ height: `${height}px` }}
                                                                title={`${count} Karten`}
                                                            />
                                                            <span className="text-muted-foreground text-[10px]">{cost}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {Object.keys(statistics.type_distribution).length > 0 && (
                                        <div>
                                            <p className="text-muted-foreground mb-1 text-xs">Typen</p>
                                            <div className="space-y-0.5">
                                                {Object.entries(statistics.type_distribution)
                                                    .sort(([, a], [, b]) => b - a)
                                                    .slice(0, 5)
                                                    .map(([type, count]) => (
                                                        <div key={type} className="flex justify-between text-xs">
                                                            <span className="truncate">{type}</span>
                                                            <span className="text-muted-foreground">{count}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeCard && (
                        <div className="rounded border bg-background p-2 shadow-lg">
                            {activeCard.quantity}x {activeCard.printing?.card?.name}
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </AppLayout>
    );
}
