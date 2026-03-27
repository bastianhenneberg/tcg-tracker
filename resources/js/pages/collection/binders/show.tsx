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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    useDroppable,
    useDraggable,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, router } from '@inertiajs/react';
import { BookOpen, ChevronLeft, ChevronRight, Edit, Eye, GripVertical, PanelRightClose, PanelRightOpen, Plus, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDebouncedCallback } from 'use-debounce';

interface BinderPage {
    id: number;
    page_number: number;
    notes: string | null;
    inventory_items_count: number;
}

interface Binder {
    id: number;
    name: string;
    description: string | null;
    color: string | null;
    pages: BinderPage[];
}

interface PreviewState {
    imageUrl: string;
    cardName: string;
    position: { left: number; top: number };
}

interface Props {
    binder: Binder;
    currentPage: BinderPage | null;
    currentPageNumber: number;
    slots: Record<number, UnifiedInventory[]>;
    totalPages: number;
}

const MAX_CARDS_PER_SLOT = 4;

// Draggable card in header strip style (for extra cards)
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
        data: { type: 'card', card, slot: card.binder_slot },
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
            {...attributes}
            {...listeners}
            className={`relative h-8 overflow-hidden rounded-t-lg shadow-sm transition-all cursor-grab active:cursor-grabbing ${
                isHovered ? 'ring-2 ring-primary z-10' : ''
            } ${isInDeck ? 'grayscale' : ''}`}
            onMouseEnter={() => onHover(card.id)}
            onMouseLeave={() => { onHover(null); onHidePreview(); }}
        >
            {card.printing?.image_url ? (
                <img
                    src={card.printing.image_url}
                    alt={card.printing.card?.name ?? ''}
                    className="w-full object-cover object-top pointer-events-none"
                    style={{ height: '200px', marginTop: '0' }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800 px-2 pointer-events-none">
                    <span className="truncate text-[10px] font-medium text-white">
                        {card.printing?.card?.name ?? 'Karte'}
                    </span>
                </div>
            )}
            {isHovered && (
                <div className="absolute inset-0 flex items-center justify-end gap-1 bg-black/40 px-1 pointer-events-none">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => onShowPreview(card)}
                        onMouseLeave={onHidePreview}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow pointer-events-auto"
                    >
                        <Eye className="h-3 w-3" />
                    </button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow pointer-events-auto"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

// Draggable card strip - shows just the top portion of a card (for back cards in stack)
function DraggableCardStrip({
    card,
    isHovered,
    onHover,
    onShowPreview,
    onHidePreview,
    onRemove,
    isDragging,
    isInDeck,
    stripHeight,
}: {
    card: UnifiedInventory;
    isHovered: boolean;
    onHover: (id: number | null) => void;
    onShowPreview: (card: UnifiedInventory) => void;
    onHidePreview: () => void;
    onRemove: (id: number) => void;
    isDragging?: boolean;
    isInDeck: boolean;
    stripHeight: number;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: `card-${card.id}`,
        data: { type: 'card', card, slot: card.binder_slot },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        height: `${stripHeight}px`,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`relative w-full overflow-hidden cursor-grab active:cursor-grabbing ${
                isHovered ? 'ring-2 ring-primary z-10 rounded' : ''
            } ${isInDeck ? 'grayscale' : ''}`}
            onMouseEnter={() => onHover(card.id)}
            onMouseLeave={() => { onHover(null); onHidePreview(); }}
        >
            {card.printing?.image_url ? (
                <img
                    src={card.printing.image_url}
                    alt={card.printing.card?.name ?? ''}
                    className="w-full object-cover object-top pointer-events-none"
                    style={{ height: '300px' }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted px-2 pointer-events-none">
                    <span className="truncate text-xs font-medium">
                        {card.printing?.card?.name ?? 'Karte'}
                    </span>
                </div>
            )}
            {isHovered && (
                <div className="absolute inset-0 flex items-center justify-end gap-1 bg-black/50 px-1 pointer-events-none">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => onShowPreview(card)}
                        onMouseLeave={onHidePreview}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow pointer-events-auto"
                    >
                        <Eye className="h-3 w-3" />
                    </button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow pointer-events-auto"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

// Draggable list item for the hover popup
function DraggableListItem({
    card,
    index,
    onShowPreview,
    onHidePreview,
    onRemove,
    isDragging,
}: {
    card: UnifiedInventory;
    index: number;
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
        data: { type: 'card', card, slot: card.binder_slot },
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
            {...attributes}
            {...listeners}
            className={`group flex items-center gap-2 rounded p-1.5 text-sm cursor-grab active:cursor-grabbing ${
                isInDeck ? 'opacity-50' : ''
            } hover:bg-accent`}
            onMouseEnter={() => onShowPreview(card)}
            onMouseLeave={onHidePreview}
        >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{index + 1}.</span>
            <span className="flex-1 truncate">{card.printing?.card?.name}</span>
            {isInDeck && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0">Deck</Badge>
            )}
            <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
            >
                <Trash2 className="h-3 w-3" />
            </button>
        </div>
    );
}

// Draggable simple card - clean single card display
function DraggableSimpleCard({
    card,
    isHovered,
    onHover,
    onShowPreview,
    onHidePreview,
    onRemove,
    isDragging,
    isInDeck,
    deckNames,
}: {
    card: UnifiedInventory;
    isHovered: boolean;
    onHover: (id: number | null) => void;
    onShowPreview: (card: UnifiedInventory) => void;
    onHidePreview: () => void;
    onRemove: (id: number) => void;
    isDragging?: boolean;
    isInDeck: boolean;
    deckNames: string[];
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: `card-${card.id}`,
        data: { type: 'card', card, slot: card.binder_slot },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="relative h-full w-full cursor-grab active:cursor-grabbing"
            onMouseEnter={() => onHover(card.id)}
            onMouseLeave={() => { onHover(null); onHidePreview(); }}
        >
            {card.printing?.image_url ? (
                <img
                    src={card.printing.image_url}
                    alt={card.printing.card?.name ?? ''}
                    className={`max-h-full max-w-full rounded-lg shadow-md transition-all duration-200 pointer-events-none ${
                        isHovered ? 'shadow-xl ring-2 ring-primary' : ''
                    } ${isInDeck ? 'grayscale' : ''}`}
                />
            ) : (
                <div className={`aspect-[2.5/3.5] bg-muted text-muted-foreground flex w-full items-center justify-center rounded-lg text-center text-xs shadow-md pointer-events-none ${
                    isHovered ? 'shadow-xl ring-2 ring-primary' : ''
                } ${isInDeck ? 'grayscale' : ''}`}>
                    {card.printing?.card?.name}
                </div>
            )}
            {isInDeck && deckNames.length > 0 && (
                <div className="absolute bottom-1 left-1 right-1 z-[55] pointer-events-none">
                    <Badge variant="secondary" className="bg-amber-500/90 text-white text-[10px] px-1.5 py-0.5 shadow truncate max-w-full block">
                        {deckNames.join(', ')}
                    </Badge>
                </div>
            )}
            {isHovered && !isDragging && (
                <div className="absolute right-1 top-1 flex gap-1 pointer-events-none">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => onShowPreview(card)}
                        onMouseLeave={onHidePreview}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 pointer-events-auto"
                    >
                        <Eye className="h-3 w-3" />
                    </button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110 pointer-events-auto"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

// Draggable full card - same size for all cards in stack
function DraggableFullCard({
    card,
    offset,
    zIndex,
    isTopCard,
    scale,
    isHovered,
    onHover,
    onShowPreview,
    onHidePreview,
    onOpenDetail,
    onRemove,
    isDragging,
    isInDeck,
    deckNames,
}: {
    card: UnifiedInventory;
    offset: number;
    zIndex: number;
    isTopCard: boolean;
    scale: number;
    isHovered: boolean;
    onHover: (id: number | null) => void;
    onShowPreview: (card: UnifiedInventory, event?: React.MouseEvent) => void;
    onHidePreview: () => void;
    onOpenDetail: (card: UnifiedInventory) => void;
    onRemove: (id: number) => void;
    isDragging?: boolean;
    isInDeck: boolean;
    deckNames: string[];
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: `card-${card.id}`,
        data: { type: 'card', card, slot: card.binder_slot },
    });

    const baseTransform = CSS.Transform.toString(transform);
    const style = {
        transform: baseTransform ? `${baseTransform} translateX(-50%)` : 'translateX(-50%)',
        transition,
        opacity: isDragging ? 0.5 : 1,
        top: `${offset}px`,
        left: '50%',
        zIndex: zIndex,
        width: `${scale * 100}%`,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="absolute cursor-grab active:cursor-grabbing"
            onMouseEnter={() => onHover(card.id)}
            onMouseLeave={() => { onHover(null); onHidePreview(); }}
        >
            {card.printing?.image_url ? (
                <img
                    src={card.printing.image_url}
                    alt={card.printing.card?.name ?? ''}
                    className={`w-full rounded-lg transition-all duration-200 pointer-events-none ${isInDeck ? 'grayscale' : ''}`}
                />
            ) : (
                <div className={`aspect-[2.5/3.5] bg-muted text-muted-foreground flex w-full items-center justify-center rounded-lg text-center text-xs pointer-events-none ${isInDeck ? 'grayscale' : ''}`}>
                    {card.printing?.card?.name}
                </div>
            )}
            {isInDeck && deckNames.length > 0 && isTopCard && (
                <div className="absolute bottom-1 left-1 right-1 z-[55] pointer-events-none">
                    <Badge variant="secondary" className="bg-amber-500/90 text-white text-[10px] px-1.5 py-0.5 shadow truncate max-w-full block">
                        {deckNames.join(', ')}
                    </Badge>
                </div>
            )}
            {isHovered && !isDragging && (
                <div className="absolute right-1 top-1 z-[100] flex gap-1">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onOpenDetail(card); }}
                        onMouseEnter={(e) => onShowPreview(card, e)}
                        onMouseLeave={onHidePreview}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// Stacked cards in a slot - all cards same size, offset stacking
function StackedCards({
    cards,
    onShowPreview,
    onHidePreview,
    onOpenDetail,
    onRemove,
    activeCardId,
}: {
    cards: UnifiedInventory[];
    onShowPreview: (card: UnifiedInventory, event?: React.MouseEvent) => void;
    onHidePreview: () => void;
    onOpenDetail: (card: UnifiedInventory) => void;
    onRemove: (id: number) => void;
    activeCardId: number | null;
}) {
    const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);

    if (cards.length === 0) return null;

    // Offset for each card in the stack
    const CARD_OFFSET = 75;

    // Calculate card scale to fit all cards in container
    // With 4 cards at 75px offset, we need room for 3*75 = 225px of offsets
    // Card should take remaining space
    const totalOffsetSpace = (cards.length - 1) * CARD_OFFSET;
    // Scale cards down so they fit (assuming slot is ~350px tall, card needs to be smaller)
    const cardScale = cards.length === 1 ? 1 : Math.min(1, 1 - (cards.length - 1) * 0.12);

    // Calculate vertical centering offset
    // Total stack height = card height (scaled) + total offsets
    // We want to center the entire stack
    const maxOffset = (cards.length - 1) * CARD_OFFSET * cardScale;

    return (
        <div className="relative h-full w-full flex items-center justify-center">
            <div className="relative w-full" style={{ height: `calc(${cardScale * 100}% + ${maxOffset}px)`, maxHeight: '100%' }}>
            {cards.map((card, index) => {
                const isInDeck = card.is_in_deck ?? false;
                const deckNames = card.deck_names ?? [];
                // First card (back) at top (offset 0), last card (front) lower down
                const offset = index * CARD_OFFSET * cardScale;
                const zIndex = index + 1;
                const isTopCard = index === cards.length - 1;

                return (
                    <DraggableFullCard
                        key={card.id}
                        card={card}
                        offset={offset}
                        zIndex={zIndex}
                        isTopCard={isTopCard}
                        scale={cardScale}
                        isHovered={hoveredCardId === card.id}
                        onHover={setHoveredCardId}
                        onShowPreview={onShowPreview}
                        onHidePreview={onHidePreview}
                        onOpenDetail={onOpenDetail}
                        onRemove={onRemove}
                        isDragging={activeCardId === card.id}
                        isInDeck={isInDeck}
                        deckNames={deckNames}
                    />
                );
            })}

            {/* Card count badge */}
            {cards.length > 1 && (
                <div className="absolute right-0 top-0 z-[60] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
                    {cards.length}
                </div>
            )}
            </div>
        </div>
    );
}

// Draggable title strip - shows just the top portion of a card (title area)
function DraggableTitleStrip({
    card,
    stripHeight,
    isHovered,
    onHover,
    onShowPreview,
    onHidePreview,
    onRemove,
    isDragging,
    isInDeck,
}: {
    card: UnifiedInventory;
    stripHeight: number;
    isHovered: boolean;
    onHover: (id: number | null) => void;
    onShowPreview: (card: UnifiedInventory) => void;
    onHidePreview: () => void;
    onRemove: (id: number) => void;
    isDragging?: boolean;
    isInDeck: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: `card-${card.id}`,
        data: { type: 'card', card, slot: card.binder_slot },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, height: `${stripHeight}px`, flexShrink: 0 }}
            {...attributes}
            {...listeners}
            className={`relative w-full overflow-hidden cursor-grab active:cursor-grabbing ${
                isHovered ? 'ring-2 ring-primary z-10' : ''
            } ${isInDeck ? 'grayscale' : ''}`}
            onMouseEnter={() => onHover(card.id)}
            onMouseLeave={() => { onHover(null); onHidePreview(); }}
        >
            {card.printing?.image_url ? (
                <img
                    src={card.printing.image_url}
                    alt={card.printing.card?.name ?? ''}
                    className="absolute top-0 left-0 w-full pointer-events-none"
                    style={{ height: 'auto' }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted px-2 pointer-events-none">
                    <span className="truncate text-xs font-medium">
                        {card.printing?.card?.name ?? 'Karte'}
                    </span>
                </div>
            )}
            {isHovered && (
                <div className="absolute inset-0 flex items-center justify-end gap-1 bg-black/50 px-1 pointer-events-none">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => onShowPreview(card)}
                        onMouseLeave={onHidePreview}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow pointer-events-auto"
                    >
                        <Eye className="h-2.5 w-2.5" />
                    </button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow pointer-events-auto"
                    >
                        <Trash2 className="h-2.5 w-2.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

// Draggable search result card
function DraggableSearchCard({
    item,
    disabled,
}: {
    item: UnifiedInventory;
    disabled: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: `search-${item.id}`,
        data: { type: 'search-card', card: item },
        disabled,
    });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`group relative aspect-[2.5/3.5] overflow-hidden rounded-lg border transition-all ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary'
            }`}
        >
            {item.printing?.image_url ? (
                <img src={item.printing.image_url} alt={item.printing.card?.name} className="h-full w-full object-cover pointer-events-none" />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-xs p-1 text-center pointer-events-none">
                    {item.printing?.card?.name}
                </div>
            )}
            {!disabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                    <GripVertical className="h-6 w-6 text-white" />
                </div>
            )}
        </div>
    );
}

// Droppable slot
function DroppableSlot({
    slotNumber,
    cards,
    onShowPreview,
    onHidePreview,
    onOpenDetail,
    onRemove,
    activeCardId,
}: {
    slotNumber: number;
    cards: UnifiedInventory[];
    onShowPreview: (card: UnifiedInventory, event?: React.MouseEvent) => void;
    onHidePreview: () => void;
    onOpenDetail: (card: UnifiedInventory) => void;
    onRemove: (id: number) => void;
    activeCardId: number | null;
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: `slot-${slotNumber}`,
        data: { type: 'slot', slotNumber },
    });

    const hasCards = cards.length > 0;

    return (
        <div
            ref={setNodeRef}
            className={`group relative aspect-[2.5/3.5] rounded-lg transition-all ${
                isOver ? 'border-2 border-primary bg-primary/10 scale-[1.02]' :
                hasCards ? '' : 'border-2 border-dashed border-muted-foreground/30 bg-muted/20'
            }`}
        >
            {hasCards ? (
                <StackedCards
                    cards={cards}
                    onShowPreview={onShowPreview}
                    onHidePreview={onHidePreview}
                    onOpenDetail={onOpenDetail}
                    onRemove={onRemove}
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

export default function BinderShow({
    binder,
    currentPage,
    currentPageNumber,
    slots: initialSlots,
    totalPages,
}: Props) {
    const [slots, setSlots] = useState(initialSlots);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [searchPanelOpen, setSearchPanelOpen] = useState(false);

    // Update slots when page changes
    useEffect(() => {
        setSlots(initialSlots);
    }, [initialSlots, currentPageNumber]);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UnifiedInventory[]>([]);
    const [searching, setSearching] = useState(false);
    const [editForm, setEditForm] = useState({ name: binder.name, description: binder.description ?? '' });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [addingPage, setAddingPage] = useState(false);
    const [previewState, setPreviewState] = useState<PreviewState | null>(null);
    const [activeCardId, setActiveCardId] = useState<number | null>(null);
    const [activeCard, setActiveCard] = useState<UnifiedInventory | null>(null);
    const [cardDetailDialog, setCardDetailDialog] = useState<UnifiedInventory | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Ordner', href: '/binders' },
        { title: binder.name, href: `/binders/${binder.id}` },
    ];

    // Search for available cards
    const handleSearch = useDebouncedCallback(async (query: string) => {
        if (!query.trim() || !currentPage) return;
        setSearching(true);
        try {
            const response = await fetch(`/binder-pages/${currentPage.id}/available-cards?search=${encodeURIComponent(query)}`, {
                headers: { 'Accept': 'application/json' },
            });
            const data = await response.json();
            setSearchResults(data.cards?.data || []);
        } catch (e) {
            console.error('Search failed:', e);
        } finally {
            setSearching(false);
        }
    }, 300);

    // Add card to slot
    const handleAddCard = (inventoryId: number) => {
        if (!currentPage || selectedSlot === null) return;
        router.post(`/binder-pages/${currentPage.id}/assign`, {
            inventory_id: inventoryId,
            slot: selectedSlot,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSearchQuery('');
                setSearchResults([]);
            },
        });
    };

    // Remove card
    const handleRemoveCard = (inventoryId: number) => {
        if (!currentPage) return;
        router.post(`/binder-pages/${currentPage.id}/remove`, {
            inventory_id: inventoryId,
        }, {
            preserveScroll: true,
        });
    };

    // Move card to different slot
    const handleMoveCard = (inventoryId: number, targetSlot: number) => {
        if (!currentPage) return;
        router.post(`/binder-pages/${currentPage.id}/move-to-slot`, {
            inventory_id: inventoryId,
            to_slot: targetSlot,
        }, {
            preserveScroll: true,
        });
    };

    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const card = active.data.current?.card as UnifiedInventory | undefined;
        if (card) {
            setActiveCardId(card.id);
            setActiveCard(card);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCardId(null);
        setActiveCard(null);

        if (!over) return;

        const card = active.data.current?.card as UnifiedInventory | undefined;
        const activeType = active.data.current?.type;
        if (!card) return;

        const overType = over.data.current?.type;
        let targetSlot: number;

        if (overType === 'slot') {
            targetSlot = over.data.current?.slotNumber as number;
        } else if (overType === 'card') {
            targetSlot = (over.data.current?.card as UnifiedInventory).binder_slot ?? 1;
        } else {
            return;
        }

        const targetCards = slots[targetSlot] || [];
        if (targetCards.length >= MAX_CARDS_PER_SLOT) return;

        // Check if it's a search card being dropped (new card to add)
        if (activeType === 'search-card') {
            // Add new card from search to slot
            if (!currentPage) return;
            router.post(`/binder-pages/${currentPage.id}/assign`, {
                inventory_id: card.id,
                slot: targetSlot,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setSearchQuery('');
                    setSearchResults([]);
                },
            });
        } else if (card.binder_slot !== targetSlot) {
            // Move existing card to different slot
            handleMoveCard(card.id, targetSlot);
        }
    };

    // Preview - shows next to the button that triggered it
    const handleShowPreview = useCallback((card: UnifiedInventory, event?: React.MouseEvent) => {
        if (!card.printing?.image_url) return;

        const previewWidth = 256;
        const previewHeight = 358;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left: number;
        let top: number;

        if (event) {
            const target = event.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            // Position to the left of the button
            left = rect.left - previewWidth - 12;
            if (left < 8) left = rect.right + 12; // Fallback to right if no space
            top = rect.top - previewHeight / 2 + rect.height / 2;
        } else {
            // Fallback to center of viewport
            left = (viewportWidth - previewWidth) / 2;
            top = (viewportHeight - previewHeight) / 2;
        }

        // Keep within viewport bounds
        if (top < 8) top = 8;
        if (top + previewHeight > viewportHeight - 8) top = viewportHeight - previewHeight - 8;

        setPreviewState({
            imageUrl: card.printing.image_url,
            cardName: card.printing.card?.name ?? '',
            position: { left, top },
        });
    }, []);

    const handleHidePreview = useCallback(() => setPreviewState(null), []);

    const handleSave = () => {
        setSaving(true);
        router.patch(`/binders/${binder.id}`, editForm, {
            onSuccess: () => { setShowEditDialog(false); setSaving(false); },
            onError: () => setSaving(false),
        });
    };

    const handleDelete = () => {
        setDeleting(true);
        router.delete(`/binders/${binder.id}`, { onError: () => setDeleting(false) });
    };

    const handleAddPage = () => {
        setAddingPage(true);
        router.post(`/binders/${binder.id}/pages`, {}, {
            onSuccess: () => setAddingPage(false),
            onError: () => setAddingPage(false),
        });
    };

    const goToPage = (pageNum: number) => {
        router.get(`/binders/${binder.id}`, { page: pageNum }, { preserveScroll: true });
    };

    const openSearchForSlot = (slot: number) => {
        setSelectedSlot(slot);
        setSearchPanelOpen(true);
        setSearchQuery('');
        setSearchResults([]);
    };

    const gridSlots = Array.from({ length: 9 }, (_, i) => i + 1);
    const totalCards = Object.values(slots).reduce((sum, cards) => sum + (cards?.length || 0), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={binder.name} />

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="flex h-full flex-1">
                    {/* Main Content */}
                    <div className={`flex-1 flex flex-col gap-4 p-4 transition-all duration-300 ${searchPanelOpen ? 'mr-80' : ''}`}>
                        {/* Header */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="flex items-center gap-2 text-2xl font-bold">
                                    <BookOpen className="h-6 w-6" />
                                    {binder.name}
                                </h1>
                                {binder.description && <p className="text-muted-foreground">{binder.description}</p>}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setSearchPanelOpen(!searchPanelOpen)}>
                                    {searchPanelOpen ? <PanelRightClose className="mr-2 h-4 w-4" /> : <PanelRightOpen className="mr-2 h-4 w-4" />}
                                    {searchPanelOpen ? 'Schließen' : 'Karten suchen'}
                                </Button>
                                <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                                    <Edit className="mr-2 h-4 w-4" />Bearbeiten
                                </Button>
                                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                                    <Trash2 className="mr-2 h-4 w-4" />Löschen
                                </Button>
                            </div>
                        </div>

                        {/* Page Navigation */}
                        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                            <Button variant="outline" onClick={() => goToPage(currentPageNumber - 1)} disabled={currentPageNumber <= 1}>
                                <ChevronLeft className="mr-2 h-4 w-4" />Vorherige
                            </Button>
                            <div className="flex items-center gap-4">
                                <span className="text-lg font-medium">Seite {currentPageNumber} von {totalPages || 0}</span>
                                {currentPage && <Badge variant="secondary" className="text-sm">{totalCards} Karten</Badge>}
                                <Button variant="outline" size="sm" onClick={handleAddPage} disabled={addingPage}>
                                    <Plus className="mr-2 h-4 w-4" />Neue Seite
                                </Button>
                            </div>
                            <Button variant="outline" onClick={() => goToPage(currentPageNumber + 1)} disabled={currentPageNumber >= totalPages}>
                                Nächste<ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>

                        {/* 3x3 Binder Grid with D&D */}
                        {currentPage ? (
                            <div className="rounded-lg border-2 p-6" ref={containerRef}>
                                    <div className="grid grid-cols-3 gap-4">
                                        {gridSlots.map((slot) => {
                                            const cards = slots[slot] || [];
                                            return (
                                                <DroppableSlot
                                                    key={slot}
                                                    slotNumber={slot}
                                                    cards={cards}
                                                    onShowPreview={handleShowPreview}
                                                    onHidePreview={handleHidePreview}
                                                    onOpenDetail={setCardDetailDialog}
                                                    onRemove={handleRemoveCard}
                                                    activeCardId={activeCardId}
                                                />
                                            );
                                        })}
                                    </div>
                                    {currentPage.notes && (
                                        <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                                            <p className="text-muted-foreground text-sm">{currentPage.notes}</p>
                                        </div>
                                    )}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
                                    <h3 className="text-lg font-medium">Keine Seiten</h3>
                                    <p className="text-muted-foreground mb-4 text-center">Erstelle deine erste Seite, um Karten hinzuzufügen.</p>
                                    <Button onClick={handleAddPage} disabled={addingPage}>
                                        <Plus className="mr-2 h-4 w-4" />Erste Seite erstellen
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Quick Page Navigation */}
                        {totalPages > 1 && (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {binder.pages.map((page) => (
                                    <Button key={page.id} variant={page.page_number === currentPageNumber ? 'default' : 'outline'} size="sm" onClick={() => goToPage(page.page_number)}>
                                        {page.page_number}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Search Sidebar */}
                    <div className={`fixed right-0 top-0 h-full w-80 transform border-l bg-background shadow-lg transition-transform duration-300 ${searchPanelOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ zIndex: 40 }}>
                        <div className="flex h-full flex-col">
                            {/* Sidebar Header */}
                            <div className="flex items-center justify-between border-b p-4">
                                <div>
                                    <h3 className="font-semibold">Karte hinzufügen</h3>
                                    {selectedSlot && <p className="text-muted-foreground text-sm">Slot {selectedSlot}</p>}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSearchPanelOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Slot Selection */}
                            <div className="border-b p-4">
                                <Label className="mb-2 block text-sm">Ziel-Slot auswählen:</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {gridSlots.map((slot) => {
                                        const slotCards = slots[slot] || [];
                                        const isFull = slotCards.length >= MAX_CARDS_PER_SLOT;
                                        return (
                                            <Button
                                                key={slot}
                                                variant={selectedSlot === slot ? 'default' : 'outline'}
                                                size="sm"
                                                className="h-8"
                                                disabled={isFull}
                                                onClick={() => setSelectedSlot(slot)}
                                            >
                                                {slot} {slotCards.length > 0 && `(${slotCards.length})`}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Search Input */}
                            <div className="p-4">
                                <div className="relative">
                                    <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                                    <Input
                                        placeholder="Kartenname suchen..."
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            {/* Search Results */}
                            <div className="flex-1 overflow-auto p-4 pt-0">
                                {searching && <p className="text-muted-foreground text-sm">Suche...</p>}
                                {!searching && searchResults.length === 0 && searchQuery && (
                                    <p className="text-muted-foreground text-sm">Keine Karten gefunden.</p>
                                )}
                                {!searching && searchResults.length === 0 && !searchQuery && (
                                    <p className="text-muted-foreground text-sm">Suche nach Karten und ziehe sie in einen Slot.</p>
                                )}
                                {searchResults.length > 0 && (
                                    <p className="text-muted-foreground text-xs mb-2">Ziehe Karten in einen Slot oder wähle zuerst einen Slot aus.</p>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    {searchResults.map((item) => (
                                        <DraggableSearchCard
                                            key={item.id}
                                            item={item}
                                            disabled={false}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeCard && activeCard.printing?.image_url && (
                        <div className="pointer-events-none w-24 opacity-90">
                            <img src={activeCard.printing.image_url} alt={activeCard.printing.card?.name} className="rounded-lg shadow-2xl ring-2 ring-primary" />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {/* Hover preview portal */}
            {previewState && typeof document !== 'undefined' && createPortal(
                <div className="pointer-events-none" style={{ position: 'fixed', left: previewState.position.left, top: previewState.position.top, zIndex: 9999 }}>
                    <img src={previewState.imageUrl} alt={previewState.cardName} className="w-64 h-auto rounded-lg shadow-2xl ring-2 ring-white/20" />
                </div>,
                document.body
            )}

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ordner bearbeiten</DialogTitle>
                        <DialogDescription>Ändere den Namen oder die Beschreibung des Ordners.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Beschreibung</Label>
                            <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Optionale Beschreibung..." rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>Abbrechen</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ordner löschen?</DialogTitle>
                        <DialogDescription>
                            Möchtest du den Ordner "{binder.name}" wirklich löschen?
                            Die Karten bleiben in deiner Sammlung, werden aber aus dem Ordner entfernt.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Abbrechen</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Löschen...' : 'Löschen'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Card Detail Dialog */}
            <Dialog open={!!cardDetailDialog} onOpenChange={(open) => !open && setCardDetailDialog(null)}>
                <DialogContent className="max-w-md bg-background">
                    {cardDetailDialog && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{cardDetailDialog.printing?.card?.name ?? 'Karte'}</DialogTitle>
                                <DialogDescription>
                                    {cardDetailDialog.printing?.set?.name} • {cardDetailDialog.printing?.collector_number}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-center py-4 min-h-[200px] bg-muted/20 rounded-lg">
                                {cardDetailDialog.printing?.image_url ? (
                                    <img
                                        src={cardDetailDialog.printing.image_url}
                                        alt={cardDetailDialog.printing.card?.name ?? ''}
                                        className="max-h-[60vh] w-auto rounded-lg shadow-lg"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center text-muted-foreground">
                                        Kein Bild verfügbar
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Zustand:</span>
                                    <span>{cardDetailDialog.condition ?? '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sprache:</span>
                                    <span>{cardDetailDialog.language ?? '-'}</span>
                                </div>
                                {cardDetailDialog.is_in_deck && cardDetailDialog.deck_names && cardDetailDialog.deck_names.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Im Deck:</span>
                                        <span>{cardDetailDialog.deck_names.join(', ')}</span>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCardDetailDialog(null)}>Schließen</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
