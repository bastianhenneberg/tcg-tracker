import { Badge } from '@/components/ui/badge';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type UnifiedInventory } from '@/types/unified';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Eye, GripVertical, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDebouncedCallback } from 'use-debounce';

interface PreviewState {
    cardId: number;
    imageUrl: string;
    cardName: string;
    position: { left: number; top: number };
}

// Header strip for extra cards - shows top portion of card image (draggable)
function DraggableHeaderStrip({
    card,
    isHovered,
    onHover,
    onShowPreview,
    onHidePreview,
    onRemove,
    isDragging,
}: {
    card: UnifiedInventory;
    isHovered: boolean;
    onHover: (id: number | null) => void;
    onShowPreview: (card: UnifiedInventory) => void;
    onHidePreview: () => void;
    onRemove: (id: number) => void;
    isDragging?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: `card-${card.id}`,
        data: {
            type: 'card',
            card,
            slot: card.binder_slot,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const isInDeck = card.is_in_deck ?? false;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative h-7 overflow-hidden rounded-t transition-all ${
                isHovered ? 'ring-2 ring-primary z-10' : ''
            } ${isInDeck ? 'opacity-50 grayscale' : ''}`}
            onMouseEnter={() => onHover(card.id)}
            onMouseLeave={() => {
                onHover(null);
                onHidePreview();
            }}
        >
            {/* Show top portion of card image */}
            {card.printing?.image_url ? (
                <img
                    src={card.printing.image_url}
                    alt={card.printing.card?.name ?? ''}
                    className="w-full object-cover object-top"
                    style={{ height: '200px', marginTop: '0' }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800 px-2">
                    <span className="truncate text-[10px] font-medium text-white">
                        {card.printing?.card?.name ?? 'Karte'}
                    </span>
                </div>
            )}

            {/* Hover controls overlay */}
            {isHovered && (
                <div className="absolute inset-0 flex items-center justify-end gap-1 bg-black/40 px-1">
                    <button
                        {...attributes}
                        {...listeners}
                        className="flex h-5 w-5 cursor-grab items-center justify-center rounded-full bg-muted/90 text-muted-foreground shadow active:cursor-grabbing"
                    >
                        <GripVertical className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => onShowPreview(card)}
                        onMouseLeave={onHidePreview}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
                    >
                        <Eye className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(card.id);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

// Main card with full image (draggable)
function DraggableMainCard({
    card,
    isHovered,
    onHover,
    onShowPreview,
    onHidePreview,
    onRemove,
    isDragging,
}: {
    card: UnifiedInventory;
    isHovered: boolean;
    onHover: (id: number | null) => void;
    onShowPreview: (card: UnifiedInventory) => void;
    onHidePreview: () => void;
    onRemove: (id: number) => void;
    isDragging?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: `card-${card.id}`,
        data: {
            type: 'card',
            card,
            slot: card.binder_slot,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const isInDeck = card.is_in_deck ?? false;
    const deckNames = card.deck_names ?? [];

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative flex-1 min-h-0"
            onMouseEnter={() => onHover(card.id)}
            onMouseLeave={() => {
                onHover(null);
                onHidePreview();
            }}
        >
            {card.printing?.image_url ? (
                <img
                    src={card.printing.image_url}
                    alt={card.printing.card?.name ?? ''}
                    className={`h-full w-full rounded-lg object-cover shadow-md transition-all duration-200 ${
                        isHovered ? 'shadow-xl ring-2 ring-primary' : ''
                    } ${isInDeck ? 'opacity-50 grayscale' : ''}`}
                />
            ) : (
                <div className={`bg-muted text-muted-foreground flex h-full w-full items-center justify-center rounded-lg text-center text-xs shadow-md ${
                    isHovered ? 'shadow-xl ring-2 ring-primary' : ''
                } ${isInDeck ? 'opacity-50 grayscale' : ''}`}>
                    {card.printing?.card?.name}
                </div>
            )}

            {/* "Im Deck" Badge */}
            {isInDeck && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="absolute bottom-1 left-1 z-[55]">
                            <Badge variant="secondary" className="bg-amber-500/90 text-white text-[9px] px-1 py-0 shadow">
                                Im Deck
                            </Badge>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p className="text-xs">{deckNames.join(', ')}</p>
                    </TooltipContent>
                </Tooltip>
            )}

            {/* Hover overlay with controls */}
            {isHovered && !isDragging && (
                <div className="absolute right-1 top-1 flex gap-1">
                    <button
                        {...attributes}
                        {...listeners}
                        className="flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-muted text-muted-foreground shadow-lg transition-transform hover:scale-110 active:cursor-grabbing"
                    >
                        <GripVertical className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => onShowPreview(card)}
                        onMouseLeave={onHidePreview}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
                    >
                        <Eye className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(card.id);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

interface StackedCardsProps {
    cards: UnifiedInventory[];
    slotNumber: number;
    onRemoveCard: (id: number) => void;
    isFull: boolean;
    onSlotClick: () => void;
    activeCardId: number | null;
}

function StackedCards({ cards, slotNumber, onRemoveCard, isFull, onSlotClick, activeCardId }: StackedCardsProps) {
    const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
    const [previewState, setPreviewState] = useState<PreviewState | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const calculatePreviewPosition = useCallback((card: UnifiedInventory) => {
        if (!containerRef.current) return null;

        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const previewWidth = 256;
        const previewHeight = 358;

        let left: number;
        let top: number;

        if (rect.right + previewWidth + 16 < viewportWidth) {
            left = rect.right + 12;
        } else {
            left = rect.left - previewWidth - 12;
        }

        top = rect.top + rect.height / 2 - previewHeight / 2;

        if (top < 8) {
            top = 8;
        } else if (top + previewHeight > viewportHeight - 8) {
            top = viewportHeight - previewHeight - 8;
        }

        return { left, top };
    }, []);

    const handleShowPreview = useCallback((card: UnifiedInventory) => {
        if (!card.printing?.image_url) return;

        const position = calculatePreviewPosition(card);
        if (position) {
            setPreviewState({
                cardId: card.id,
                imageUrl: card.printing.image_url,
                cardName: card.printing.card?.name ?? '',
                position,
            });
        }
    }, [calculatePreviewPosition]);

    const handleHidePreview = useCallback(() => {
        setPreviewState(null);
    }, []);

    // First card is main card, rest are header strips
    const mainCard = cards[0];
    const extraCards = cards.slice(1);

    return (
        <div ref={containerRef} className="group relative flex h-full w-full flex-col p-1.5">
            {/* Header strips for extra cards (stacked at top) */}
            {extraCards.length > 0 && (
                <div className="flex flex-col gap-px mb-1">
                    {extraCards.map((card) => (
                        <DraggableHeaderStrip
                            key={card.id}
                            card={card}
                            isHovered={hoveredCardId === card.id}
                            onHover={setHoveredCardId}
                            onShowPreview={handleShowPreview}
                            onHidePreview={handleHidePreview}
                            onRemove={onRemoveCard}
                            isDragging={activeCardId === card.id}
                        />
                    ))}
                </div>
            )}

            {/* Main card (full image) */}
            {mainCard && (
                <DraggableMainCard
                    card={mainCard}
                    isHovered={hoveredCardId === mainCard.id}
                    onHover={setHoveredCardId}
                    onShowPreview={handleShowPreview}
                    onHidePreview={handleHidePreview}
                    onRemove={onRemoveCard}
                    isDragging={activeCardId === mainCard.id}
                />
            )}

            {/* Card Count Badge */}
            {cards.length > 1 && (
                <div className="absolute left-1 top-1 z-[60] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
                    {cards.length}
                </div>
            )}

            {/* Add more button */}
            {!isFull && (
                <button
                    className="absolute bottom-1.5 right-1.5 z-[60] flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow transition-all hover:scale-110 group-hover:opacity-100"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSlotClick();
                    }}
                >
                    <Plus className="h-3 w-3" />
                </button>
            )}

            {/* Hover preview - rendered via portal */}
            {previewState && typeof document !== 'undefined' && createPortal(
                <div
                    className="pointer-events-none"
                    style={{
                        position: 'fixed',
                        left: previewState.position.left,
                        top: previewState.position.top,
                        zIndex: 9999,
                    }}
                >
                    <img
                        src={previewState.imageUrl}
                        alt={previewState.cardName}
                        className="w-64 h-auto rounded-lg shadow-2xl ring-2 ring-white/20"
                    />
                </div>,
                document.body
            )}
        </div>
    );
}

interface DroppableSlotProps {
    slotNumber: number;
    cards: UnifiedInventory[];
    isFull: boolean;
    isOver: boolean;
    onSlotClick: () => void;
    onRemoveCard: (id: number) => void;
    activeCardId: number | null;
}

function DroppableSlot({ slotNumber, cards, isFull, isOver, onSlotClick, onRemoveCard, activeCardId }: DroppableSlotProps) {
    const hasCards = cards.length > 0;

    return (
        <div
            className={`
                relative aspect-[2.5/3.5] overflow-hidden rounded-lg border-2 transition-all
                ${hasCards ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/20'}
                ${!isFull ? 'cursor-pointer hover:border-primary hover:bg-muted/40' : ''}
                ${isOver && !isFull ? 'border-primary bg-primary/10 ring-2 ring-primary' : ''}
            `}
            onClick={() => !hasCards && onSlotClick()}
            data-slot={slotNumber}
        >
            {hasCards ? (
                <StackedCards
                    cards={cards}
                    slotNumber={slotNumber}
                    onRemoveCard={onRemoveCard}
                    isFull={isFull}
                    onSlotClick={onSlotClick}
                    activeCardId={activeCardId}
                />
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                    <Plus className="text-muted-foreground/50 h-8 w-8" />
                    <span className="text-muted-foreground/50 text-xs">Slot {slotNumber}</span>
                </div>
            )}
        </div>
    );
}

interface BinderPage {
    id: number;
    page_number: number;
    notes: string | null;
    binder_id: number;
}

interface Binder {
    id: number;
    name: string;
}

interface Props {
    binderPage: BinderPage;
    binder: Binder;
    slots: Record<number, UnifiedInventory[]>;
}

const MAX_CARDS_PER_SLOT = 4;

export default function BinderPageShow({ binderPage, binder, slots }: Props) {
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [showCardPicker, setShowCardPicker] = useState(false);
    const [availableCards, setAvailableCards] = useState<UnifiedInventory[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeCard, setActiveCard] = useState<UnifiedInventory | null>(null);
    const [overSlot, setOverSlot] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Ordner', href: '/binders' },
        { title: binder.name, href: `/binders/${binder.id}` },
        { title: `Seite ${binderPage.page_number}`, href: `/binder-pages/${binderPage.id}` },
    ];

    const gridSlots = Array.from({ length: 9 }, (_, i) => i + 1);

    const fetchAvailableCards = useDebouncedCallback(async (search: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);

            const response = await fetch(`/binder-pages/${binderPage.id}/available-cards?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await response.json();
            setAvailableCards(data.cards.data);
        } catch (error) {
            console.error('Failed to fetch cards:', error);
        } finally {
            setLoading(false);
        }
    }, 300);

    const handleSlotClick = (slot: number) => {
        const slotCards = slots[slot] || [];
        if (slotCards.length >= MAX_CARDS_PER_SLOT) {
            return;
        }
        setSelectedSlot(slot);
        setShowCardPicker(true);
        fetchAvailableCards('');
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        fetchAvailableCards(value);
    };

    const handleAssignCard = (inventoryId: number) => {
        if (!selectedSlot) return;
        router.post(
            `/binder-pages/${binderPage.id}/assign`,
            { inventory_id: inventoryId, slot: selectedSlot },
            {
                onSuccess: () => {
                    setShowCardPicker(false);
                    setSelectedSlot(null);
                    setSearchQuery('');
                },
            }
        );
    };

    const handleRemoveCard = (inventoryId: number) => {
        router.post(`/binder-pages/${binderPage.id}/remove`, { inventory_id: inventoryId });
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const cardData = active.data.current;
        if (cardData?.type === 'card') {
            setActiveCard(cardData.card);
        }
    };

    const handleDragOver = (event: DragEndEvent) => {
        const { over } = event;
        if (over) {
            // Check if over a slot element
            const slotElement = (over.id as string).startsWith?.('card-')
                ? null
                : document.querySelector(`[data-slot="${over.id}"]`);

            if (slotElement) {
                setOverSlot(Number(over.id));
            } else {
                // Find which slot the card belongs to
                const overCardData = over.data.current;
                if (overCardData?.slot) {
                    setOverSlot(overCardData.slot);
                }
            }
        } else {
            setOverSlot(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCard(null);
        setOverSlot(null);

        if (!over || !active.data.current) return;

        const activeCardData = active.data.current;
        const activeCardId = activeCardData.card?.id;
        const sourceSlot = activeCardData.slot;

        // Determine target slot
        let targetSlot: number | null = null;

        if (typeof over.id === 'string' && over.id.startsWith('card-')) {
            // Dropped on another card - get its slot
            targetSlot = over.data.current?.slot;
        } else {
            // Dropped on a slot directly
            targetSlot = over.id as number;
        }

        if (!targetSlot || !activeCardId) return;

        // Check if moving to a different slot
        if (sourceSlot !== targetSlot) {
            const targetSlotCards = slots[targetSlot] || [];
            if (targetSlotCards.length >= MAX_CARDS_PER_SLOT) {
                return; // Target slot is full
            }

            router.post(`/binder-pages/${binderPage.id}/move-to-slot`, {
                inventory_id: activeCardId,
                to_slot: targetSlot,
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${binder.name} - Seite ${binderPage.page_number}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/binders/${binder.id}?page=${binderPage.page_number}`}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">
                                {binder.name} - Seite {binderPage.page_number}
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                Ziehe Karten zwischen Slots oder klicke um neue hinzuzufügen (max. 4 pro Slot)
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3x3 Binder Grid with DnD */}
                <Card className="border-2">
                    <CardContent className="p-6">
                        <DndContext
                            sensors={sensors}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="grid grid-cols-3 gap-4">
                                {gridSlots.map((slot) => {
                                    const slotCards = slots[slot] || [];
                                    const isFull = slotCards.length >= MAX_CARDS_PER_SLOT;

                                    return (
                                        <DroppableSlot
                                            key={slot}
                                            slotNumber={slot}
                                            cards={slotCards}
                                            isFull={isFull}
                                            isOver={overSlot === slot}
                                            onSlotClick={() => handleSlotClick(slot)}
                                            onRemoveCard={handleRemoveCard}
                                            activeCardId={activeCard?.id ?? null}
                                        />
                                    );
                                })}
                            </div>

                            {/* Drag Overlay */}
                            <DragOverlay>
                                {activeCard && (
                                    <div className="h-32 w-24 rounded-lg shadow-2xl ring-2 ring-primary">
                                        {activeCard.printing?.image_url ? (
                                            <img
                                                src={activeCard.printing.image_url}
                                                alt={activeCard.printing.card?.name ?? ''}
                                                className="h-full w-full rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center rounded-lg text-xs">
                                                {activeCard.printing?.card?.name}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </DragOverlay>
                        </DndContext>
                    </CardContent>
                </Card>
            </div>

            {/* Card Picker Dialog */}
            <Dialog open={showCardPicker} onOpenChange={setShowCardPicker}>
                <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>Karte für Slot {selectedSlot} auswählen</DialogTitle>
                        <DialogDescription>
                            Wähle eine Karte aus deiner Sammlung aus. (Max. 4 Karten pro Slot)
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                            <Input
                                placeholder="Karte suchen..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="text-muted-foreground">Laden...</div>
                                </div>
                            ) : availableCards.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <p className="text-muted-foreground">
                                        Keine verfügbaren Karten gefunden.
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        Füge zuerst Karten zu deiner Sammlung hinzu.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-3">
                                    {availableCards.map((card) => (
                                        <button
                                            key={card.id}
                                            onClick={() => handleAssignCard(card.id)}
                                            className="group relative rounded-lg border p-2 transition-colors hover:border-primary hover:bg-muted"
                                        >
                                            {card.printing?.image_url ? (
                                                <img
                                                    src={card.printing.image_url}
                                                    alt={card.printing.card?.name ?? ''}
                                                    className="aspect-[2.5/3.5] w-full rounded object-cover"
                                                />
                                            ) : (
                                                <div className="bg-muted flex aspect-[2.5/3.5] items-center justify-center rounded">
                                                    <span className="text-muted-foreground text-xs">
                                                        {card.printing?.card?.name}
                                                    </span>
                                                </div>
                                            )}
                                            {card.quantity > 1 && (
                                                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                                                    {card.quantity}x
                                                </span>
                                            )}
                                            <p className="mt-1 truncate text-xs">
                                                {card.printing?.card?.name}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCardPicker(false)}>
                            Abbrechen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
