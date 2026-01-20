import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DeckCard } from '@/types/deck';
import { ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CardThumbnail } from './card-thumbnail';

interface CardStackProps {
    cards: DeckCard[];
    onRemove?: (card: DeckCard) => void;
    onQuantityChange?: (card: DeckCard, delta: number) => void;
    className?: string;
}

// Group cards by printing_id for stacking same cards
function groupCardsByPrinting(cards: DeckCard[]): Map<number, DeckCard[]> {
    const grouped = new Map<number, DeckCard[]>();
    cards.forEach((card) => {
        const existing = grouped.get(card.printing_id);
        if (existing) {
            existing.push(card);
        } else {
            grouped.set(card.printing_id, [card]);
        }
    });
    return grouped;
}

interface SingleCardStackProps {
    card: DeckCard;
    totalQuantity: number;
    onRemove?: (card: DeckCard) => void;
    onQuantityChange?: (card: DeckCard, delta: number) => void;
}

function SingleCardStack({ card, totalQuantity, onRemove, onQuantityChange }: SingleCardStackProps) {
    const [isHovered, setIsHovered] = useState(false);
    const printing = card.printing;
    if (!printing) return null;

    return (
        <div
            className="group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Card Thumbnail */}
            <CardThumbnail
                printing={printing}
                size="md"
                showQuantity={totalQuantity > 1 ? totalQuantity : undefined}
            />

            {/* Controls Overlay - shown on hover */}
            <div
                className={cn(
                    'absolute inset-0 flex flex-col items-center justify-end rounded-lg bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 transition-opacity duration-200',
                    isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
            >
                {/* Card Name */}
                <span className="mb-2 line-clamp-2 text-center text-xs font-medium text-white">
                    {printing.card?.name}
                </span>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                            e.stopPropagation();
                            onQuantityChange?.(card, -1);
                        }}
                    >
                        <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium text-white">
                        {totalQuantity}
                    </span>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                            e.stopPropagation();
                            onQuantityChange?.(card, 1);
                        }}
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>

                {/* Delete Button */}
                <Button
                    variant="destructive"
                    size="icon"
                    className="mt-1 h-6 w-6"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.(card);
                    }}
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

export function CardStack({ cards, onRemove, onQuantityChange, className }: CardStackProps) {
    const [scrollIndex, setScrollIndex] = useState(0);
    const visibleCount = 8; // Number of visible cards before showing navigation

    if (cards.length === 0) {
        return null;
    }

    // Sort cards by name
    const sortedCards = [...cards].sort((a, b) => {
        const nameA = a.printing?.card?.name || '';
        const nameB = b.printing?.card?.name || '';
        return nameA.localeCompare(nameB);
    });

    const showNavigation = sortedCards.length > visibleCount;
    const visibleCards = showNavigation
        ? sortedCards.slice(scrollIndex, scrollIndex + visibleCount)
        : sortedCards;

    return (
        <div className={cn('relative', className)}>
            {/* Navigation - Previous */}
            {showNavigation && scrollIndex > 0 && (
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute -left-3 top-1/2 z-20 h-6 w-6 -translate-y-1/2 shadow-md"
                    onClick={() => setScrollIndex((prev) => Math.max(0, prev - 4))}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            )}

            {/* Card Grid */}
            <div className="flex flex-wrap gap-2">
                {visibleCards.map((card) => (
                    <SingleCardStack
                        key={card.id}
                        card={card}
                        totalQuantity={card.quantity}
                        onRemove={onRemove}
                        onQuantityChange={onQuantityChange}
                    />
                ))}
            </div>

            {/* Navigation - Next */}
            {showNavigation && scrollIndex + visibleCount < sortedCards.length && (
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute -right-3 top-1/2 z-20 h-6 w-6 -translate-y-1/2 shadow-md"
                    onClick={() => setScrollIndex((prev) => Math.min(sortedCards.length - visibleCount, prev + 4))}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            )}

            {/* Scroll indicator */}
            {showNavigation && (
                <div className="mt-2 flex justify-center gap-1">
                    <span className="text-muted-foreground text-xs">
                        {scrollIndex + 1}-{Math.min(scrollIndex + visibleCount, sortedCards.length)} von {sortedCards.length}
                    </span>
                </div>
            )}
        </div>
    );
}

// Vertical overlapping stack for Archidekt-style display
interface VerticalCardStackProps {
    cards: DeckCard[];
    maxVisible?: number;
    onRemove?: (card: DeckCard) => void;
    onQuantityChange?: (card: DeckCard, delta: number) => void;
    className?: string;
}

export function VerticalCardStack({
    cards,
    maxVisible = 5,
    onRemove,
    onQuantityChange,
    className,
}: VerticalCardStackProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (cards.length === 0) return null;

    // Sort by name
    const sortedCards = [...cards].sort((a, b) => {
        const nameA = a.printing?.card?.name || '';
        const nameB = b.printing?.card?.name || '';
        return nameA.localeCompare(nameB);
    });

    const displayCards = isExpanded ? sortedCards : sortedCards.slice(0, maxVisible);
    const hiddenCount = sortedCards.length - maxVisible;

    // Card height for overlap calculation (roughly 30% visible)
    const overlapOffset = 28; // pixels

    return (
        <div
            className={cn('relative', className)}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            <div
                className="relative transition-all duration-300"
                style={{
                    height: isExpanded
                        ? `${sortedCards.length * overlapOffset + 100}px`
                        : `${Math.min(displayCards.length, maxVisible) * overlapOffset + 100}px`,
                }}
            >
                {displayCards.map((card, index) => {
                    const printing = card.printing;
                    if (!printing) return null;

                    return (
                        <div
                            key={card.id}
                            className={cn(
                                'absolute left-0 w-24 transition-all duration-200',
                                'hover:z-30'
                            )}
                            style={{
                                top: `${index * overlapOffset}px`,
                                zIndex: index + 1,
                            }}
                        >
                            <SingleCardStack
                                card={card}
                                totalQuantity={card.quantity}
                                onRemove={onRemove}
                                onQuantityChange={onQuantityChange}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Hidden cards indicator */}
            {!isExpanded && hiddenCount > 0 && (
                <Badge
                    variant="secondary"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 shadow-md"
                >
                    +{hiddenCount} more
                </Badge>
            )}
        </div>
    );
}
