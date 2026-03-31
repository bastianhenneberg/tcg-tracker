import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    CardThumbnail,
    CardThumbnailSkeleton,
    DraggableSearchCard,
    isSearchCardId,
} from '@/components/deck';
import { cn } from '@/lib/utils';
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
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle,
    Download,
    Eye,
    FileUp,
    Library,
    Loader2,
    Minus,
    Package,
    PanelRightClose,
    PanelRightOpen,
    Pencil,
    Plus,
    Search,
    SearchX,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

// Helper to get CSRF token from cookie
function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

// Type for active drag item (can be deck card or search card)
type ActiveDragItem =
    | { type: 'deck'; card: DeckCard }
    | { type: 'search'; printing: UnifiedPrinting };

// Sortable card component for deck cards - supports both sorting within zone and dragging between zones
function SortableCard({ card, children, zoneSlug }: { card: DeckCard; children: React.ReactNode; zoneSlug: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `deck-${card.id}`,
        data: {
            type: 'deck',
            card,
            zoneSlug,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            {children}
        </div>
    );
}

// Droppable zone component with enhanced visuals
function DroppableZone({
    zoneSlug,
    children,
    className,
}: {
    zoneSlug: string;
    children: React.ReactNode;
    className?: string;
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: zoneSlug,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'min-h-[120px] rounded-lg border-2 border-dashed border-transparent p-3 transition-all duration-200',
                isOver && 'border-primary bg-primary/5 shadow-inner',
                className
            )}
        >
            {children}
        </div>
    );
}

// Single deck card with image and controls - using CSS hover for reliability
function DeckCardItem({
    card,
    onRemove,
    onQuantityChange,
    onPreview,
    onHoverPreview,
    onHoverLeave,
    size = 'fill',
    zoneSlug,
}: {
    card: DeckCard;
    onRemove: (card: DeckCard) => void;
    onQuantityChange: (card: DeckCard, delta: number) => void;
    onPreview: (printing: UnifiedPrinting) => void;
    onHoverPreview?: (printing: UnifiedPrinting, event: React.MouseEvent) => void;
    onHoverLeave?: () => void;
    size?: 'sm' | 'md' | 'lg' | 'fill';
    zoneSlug: string;
}) {
    const printing = card.printing;
    const ownedQty = card.owned_quantity ?? 0;

    if (!printing) return null;

    return (
        <SortableCard card={card} zoneSlug={zoneSlug}>
            <div className={cn("group relative cursor-grab active:cursor-grabbing", size === 'fill' ? 'w-full' : 'w-fit')}>
                <CardThumbnail
                    printing={printing}
                    size={size}
                    showQuantity={card.quantity > 1 ? card.quantity : undefined}
                />

                {/* Owned Status Badge - only show if owned */}
                {ownedQty > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-green-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white shadow backdrop-blur-sm">
                                <Library className="h-3 w-3" />
                                {ownedQty}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                            {ownedQty}x in Sammlung
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Controls Overlay - CSS only hover, no JS state */}
                <div className="absolute inset-0 flex flex-col items-center justify-end rounded-lg bg-black/70 p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    {/* Preview Button at top - hover shows preview, click opens dialog */}
                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onPreview(printing);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseEnter={(e) => onHoverPreview?.(printing, e)}
                        onMouseLeave={() => onHoverLeave?.()}
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </Button>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onQuantityChange(card, -1);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-bold text-white">
                            {card.quantity}
                        </span>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onQuantityChange(card, 1);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* Delete Button */}
                    <Button
                        variant="destructive"
                        size="icon"
                        className="mt-1.5 h-7 w-7"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onRemove(card);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </SortableCard>
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

export default function DeckBuilder({
    game,
    deck,
    zones,
    deckCards: initialDeckCards,
    validation: initialValidation,
    statistics: initialStatistics,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UnifiedPrinting[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [deckCards, setDeckCards] = useState(initialDeckCards);
    const [validation, setValidation] = useState(initialValidation);
    const [statistics, setStatistics] = useState(initialStatistics);
    const [activeItem, setActiveItem] = useState<ActiveDragItem | null>(null);
    const [selectedZone, setSelectedZone] = useState<string>(zones[0]?.slug || 'main');
    const [searchPanelOpen, setSearchPanelOpen] = useState(true);
    const [collectionOnly, setCollectionOnly] = useState(deck.use_collection_only);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [isMarkingInDeck, setIsMarkingInDeck] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: [] as string[] });
    const [parsedImport, setParsedImport] = useState<{
        source: string;
        deckName?: string;
        cards: { name: string; quantity: number; zone: string; pitch?: string; displayName: string }[];
    } | null>(null);
    const [previewCard, setPreviewCard] = useState<UnifiedPrinting | null>(null);
    const [hoverPreview, setHoverPreview] = useState<{ printing: UnifiedPrinting; position: { left: number; top: number } } | null>(null);

    // Get flash messages from Inertia
    const { props } = usePage<{ flash?: { success?: string; warning?: string; error?: string } }>();

    // Handle flash messages
    useEffect(() => {
        if (props.flash?.success) {
            toast.success(props.flash.success);
        }
        if (props.flash?.warning) {
            toast.warning(props.flash.warning);
        }
        if (props.flash?.error) {
            toast.error(props.flash.error);
        }
    }, [props.flash]);

    // Handle hover preview positioning
    const showHoverPreview = useCallback((printing: UnifiedPrinting, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const previewWidth = 256;
        const previewHeight = 358;

        let left: number;
        let top: number;

        // Position horizontally - prefer right, but flip to left if no room
        if (rect.right + previewWidth + 16 < viewportWidth) {
            left = rect.right + 12;
        } else {
            left = rect.left - previewWidth - 12;
        }

        // Position vertically - try to center on the element
        top = rect.top + rect.height / 2 - previewHeight / 2;

        // Keep within vertical bounds
        if (top < 8) {
            top = 8;
        } else if (top + previewHeight > viewportHeight - 8) {
            top = viewportHeight - previewHeight - 8;
        }

        setHoverPreview({ printing, position: { left, top } });
    }, []);

    const hideHoverPreview = useCallback(() => {
        setHoverPreview(null);
    }, []);

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

    // Detect source and parse decklist
    const parseDeckList = (text: string) => {
        const lines = text.split('\n').map(l => l.trim());
        const cards: { name: string; quantity: number; zone: string; pitch?: string; displayName: string }[] = [];
        let source = 'Unbekannt';
        let deckName: string | undefined;
        let currentZone = 'main';

        // Detect source
        if (text.includes('fabrary.net') || text.includes('FaBrary')) {
            source = 'FaBrary';
        } else if (text.includes('fabdb.net') || text.includes('FABDB')) {
            source = 'FABDB';
        } else if (text.includes('flesh and blood') || text.toLowerCase().includes('hero:')) {
            source = 'Flesh and Blood';
        }

        for (const line of lines) {
            if (!line) continue;

            // Extract deck name
            if (line.startsWith('Name:')) {
                deckName = line.replace('Name:', '').trim();
                continue;
            }

            // Skip metadata lines
            if (line.startsWith('Format:') || line.startsWith('Made with') || line.startsWith('See the full deck') || line.startsWith('http')) {
                continue;
            }

            // Hero line
            if (line.startsWith('Hero:')) {
                const heroName = line.replace('Hero:', '').trim();
                if (heroName) {
                    cards.push({ name: heroName, quantity: 1, zone: 'hero', displayName: heroName });
                }
                continue;
            }

            // Zone headers
            if (line.toLowerCase().includes('arena cards') || line.toLowerCase().includes('equipment')) {
                currentZone = 'equipment';
                continue;
            }
            if (line.toLowerCase().includes('deck cards') || line.toLowerCase().includes('main deck')) {
                currentZone = 'main';
                continue;
            }
            if (line.toLowerCase().includes('sideboard')) {
                currentZone = 'sideboard';
                continue;
            }

            // Card line: "3x Card Name (red)" or "1x Card Name" or "3 Card Name"
            const cardMatch = line.match(/^(\d+)x?\s+(.+?)(?:\s+\((\w+)\))?$/);
            if (cardMatch) {
                const quantity = parseInt(cardMatch[1], 10);
                const cardName = cardMatch[2].trim();
                const pitchColor = cardMatch[3]?.toLowerCase();
                const displayName = pitchColor ? `${cardName} (${pitchColor})` : cardName;
                cards.push({ name: cardName, quantity, zone: currentZone, pitch: pitchColor, displayName });
            }
        }

        return { source, deckName, cards };
    };

    // Parse button handler
    const handleParse = () => {
        if (!importText.trim()) return;
        const result = parseDeckList(importText);
        setParsedImport(result);
    };

    // Clear all cards from deck
    const clearDeck = async () => {
        // Get all current deck cards
        const allCards = deckCards.flatMap(zc => zc.cards);
        for (const card of allCards) {
            try {
                await fetch(`/g/${game.slug}/decks/${deck.id}/cards/${card.id}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    credentials: 'same-origin',
                });
            } catch (e) {
                // Continue even if one fails
            }
        }
        // Clear local state
        setDeckCards(prev => prev.map(zc => ({ ...zc, cards: [], count: 0 })));
    };

    // Import the parsed cards
    const handleImport = async () => {
        // Parse the text if not already parsed
        let cardsToImport = parsedImport?.cards;
        if (!cardsToImport || cardsToImport.length === 0) {
            const parsed = parseDeckList(importText);
            cardsToImport = parsed.cards;
            if (cardsToImport.length === 0) {
                toast.error('Keine Karten erkannt', {
                    description: 'Die Deckliste konnte nicht geparst werden. Prüfe das Format.',
                });
                return;
            }
        }

        setImporting(true);
        const errors: string[] = [];

        // First clear the deck
        setImportProgress({ current: 0, total: cardsToImport.length + 1, errors: [] });
        await clearDeck();
        setImportProgress({ current: 1, total: cardsToImport.length + 1, errors: [] });

        // Pitch color to pitch value mapping (FaB specific)
        const pitchColorToValue: Record<string, number> = {
            red: 1,
            yellow: 2,
            blue: 3,
        };

        // Import cards one by one
        for (let i = 0; i < cardsToImport.length; i++) {
            const { name, quantity, zone, pitch } = cardsToImport[i];
            setImportProgress(prev => ({ ...prev, current: i + 2 })); // +2 because clearing is step 1

            try {
                // Search for the card - include pitch color in search for better results
                const searchQuery = pitch ? `${name} ${pitch}` : name;
                const searchResponse = await fetch(
                    `/g/${game.slug}/decks/${deck.id}/search?q=${encodeURIComponent(searchQuery)}&per_page=20`
                );
                const searchData = await searchResponse.json();
                const printings: UnifiedPrinting[] = searchData.data || [];

                // Find best match considering name and pitch
                let printing: UnifiedPrinting | undefined;

                // Helper to get pitch from card's game_specific JSON
                const getCardPitch = (card: Record<string, unknown> | undefined): number | undefined => {
                    if (!card?.game_specific) return undefined;
                    const gs = typeof card.game_specific === 'string'
                        ? JSON.parse(card.game_specific)
                        : card.game_specific;
                    return gs?.pitch;
                };

                const getCardColor = (card: Record<string, unknown> | undefined): string | undefined => {
                    if (!card?.game_specific) return undefined;
                    const gs = typeof card.game_specific === 'string'
                        ? JSON.parse(card.game_specific)
                        : card.game_specific;
                    return gs?.color?.toLowerCase();
                };

                // First try: exact name match with correct pitch/color
                if (pitch) {
                    const targetPitch = pitchColorToValue[pitch];
                    printing = printings.find(p => {
                        const cardPitch = getCardPitch(p.card as unknown as Record<string, unknown>);
                        const cardColor = getCardColor(p.card as unknown as Record<string, unknown>);
                        return p.card?.name?.toLowerCase() === name.toLowerCase() &&
                            (cardPitch === targetPitch || cardColor === pitch);
                    });
                }

                // Second try: exact name match (any pitch)
                if (!printing) {
                    printing = printings.find(p =>
                        p.card?.name?.toLowerCase() === name.toLowerCase()
                    );
                }

                // Third try: first result
                if (!printing) {
                    printing = printings[0];
                }

                if (!printing) {
                    const displayName = pitch ? `${name} (${pitch})` : name;
                    errors.push(`"${displayName}" nicht gefunden`);
                    continue;
                }

                // Add card to deck (with quantity)
                for (let q = 0; q < quantity; q++) {
                    const response = await fetch(`/g/${game.slug}/decks/${deck.id}/cards`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-XSRF-TOKEN': getCsrfToken(),
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({
                            printing_id: printing.id,
                            zone: zone,
                            quantity: 1,
                        }),
                    });

                    const data: DeckBuilderResponse = await response.json();
                    if (data.success) {
                        updateLocalState(data);
                    }
                }
            } catch (error) {
                errors.push(`Fehler bei "${name}"`);
            }
        }

        setImportProgress(prev => ({ ...prev, errors }));
        setImporting(false);

        if (errors.length === 0) {
            setImportDialogOpen(false);
            setImportText('');
            setParsedImport(null);
        }
    };

    // Search for cards
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        setSearching(true);
        setHasSearched(true);
        try {
            const params = new URLSearchParams({
                q: searchQuery,
                per_page: '50',
                collection_only: collectionOnly ? '1' : '0',
            });
            const response = await fetch(
                `/g/${game.slug}/decks/${deck.id}/search?${params.toString()}`
            );
            const data = await response.json();
            setSearchResults(data.data || []);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setSearching(false);
        }
    }, [game.slug, deck.id, searchQuery, collectionOnly]);

    // Add card to deck (with optional zone override)
    const handleAddCard = async (printing: UnifiedPrinting, zoneOverride?: string) => {
        const targetZone = zoneOverride || selectedZone;

        // Check if target zone is a single-card zone (like hero) and already has a card
        const targetZoneData = zones.find(z => z.slug === targetZone);
        const targetZoneCards = deckCards.find(zc => zc.zone.slug === targetZone);
        if (targetZoneData?.max_cards === 1 && targetZoneCards && targetZoneCards.cards.length > 0) {
            toast.error('Dieser Bereich ist bereits belegt', {
                description: `Der ${targetZoneData.name}-Bereich kann nur eine Karte enthalten.`,
            });
            return;
        }

        try {
            const response = await fetch(`/g/${game.slug}/decks/${deck.id}/cards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    printing_id: printing.id,
                    zone: targetZone,
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
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
            });

            const data: DeckBuilderResponse = await response.json();
            if (data.success) {
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
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ quantity: newQty }),
            });

            const data: DeckBuilderResponse = await response.json();
            if (data.success) {
                if (newQty === 0) {
                    setDeckCards((prev) =>
                        prev.map((zc) => ({
                            ...zc,
                            cards: zc.cards.filter((c) => c.id !== card.id),
                            count: zc.cards.filter((c) => c.id !== card.id).reduce((sum, c) => sum + c.quantity, 0),
                        }))
                    );
                } else {
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

    // Helper to parse deck card ID from sortable ID
    const parseDeckCardId = (id: string | number): number | null => {
        if (typeof id === 'string' && id.startsWith('deck-')) {
            return parseInt(id.slice(5), 10);
        }
        return null;
    };

    // Handle drag start for both deck cards and search cards
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const activeId = active.id;

        // Check if it's a search card
        if (isSearchCardId(activeId)) {
            const printing = active.data.current?.printing as UnifiedPrinting | undefined;
            if (printing) {
                setActiveItem({ type: 'search', printing });
            }
        } else {
            // It's a deck card (sortable)
            const card = active.data.current?.card as DeckCard | undefined;
            if (card) {
                setActiveItem({ type: 'deck', card });
            }
        }
    };

    // Handle drag end for both deck cards and search cards
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over || !active) return;

        const activeId = active.id;
        const overId = over.id;

        // Check if it's a search card being dropped
        if (isSearchCardId(activeId)) {
            const printing = active.data.current?.printing as UnifiedPrinting | undefined;
            if (printing) {
                // Target could be a zone or a deck card (to drop before/after)
                const targetZone = overId.toString().startsWith('deck-')
                    ? (over.data.current?.zoneSlug as string)
                    : (overId as string);
                await handleAddCard(printing, targetZone);
            }
            return;
        }

        // It's a deck card being moved or sorted
        const activeCardId = parseDeckCardId(activeId);
        if (!activeCardId) return;

        const sourceZoneSlug = active.data.current?.zoneSlug as string;

        // Check if over is a zone or another card
        const overCardId = parseDeckCardId(overId);
        const isOverCard = overCardId !== null;
        const targetZoneSlug = isOverCard
            ? (over.data.current?.zoneSlug as string)
            : (overId as string);

        // Sorting within the same zone
        if (sourceZoneSlug === targetZoneSlug && isOverCard && activeCardId !== overCardId) {
            // Reorder cards within the zone
            setDeckCards((prev) => {
                const zoneIdx = prev.findIndex((zc) => zc.zone.slug === sourceZoneSlug);
                if (zoneIdx < 0) return prev;

                const zoneCards = [...prev[zoneIdx].cards];
                const activeIdx = zoneCards.findIndex((c) => c.id === activeCardId);
                const overIdx = zoneCards.findIndex((c) => c.id === overCardId);

                if (activeIdx < 0 || overIdx < 0) return prev;

                const reorderedCards = arrayMove(zoneCards, activeIdx, overIdx);
                // Update positions
                const cardsWithPositions = reorderedCards.map((card, idx) => ({
                    ...card,
                    position: idx,
                }));

                const newState = [...prev];
                newState[zoneIdx] = {
                    ...newState[zoneIdx],
                    cards: cardsWithPositions,
                };

                return newState;
            });

            // Save new positions to backend
            const zoneData = deckCards.find((zc) => zc.zone.slug === sourceZoneSlug);
            if (zoneData) {
                const zoneCards = [...zoneData.cards];
                const activeIdx = zoneCards.findIndex((c) => c.id === activeCardId);
                const overIdx = zoneCards.findIndex((c) => c.id === overCardId);
                const reorderedCards = arrayMove(zoneCards, activeIdx, overIdx);
                const positions = reorderedCards.map((card, idx) => ({
                    id: card.id,
                    position: idx,
                }));

                // Fire and forget - update positions in background
                fetch(`/g/${game.slug}/decks/${deck.id}/cards/reorder`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ positions }),
                }).catch(console.error);
            }
            return;
        }

        // Moving to a different zone
        if (sourceZoneSlug !== targetZoneSlug) {
            // Check if target zone is a single-card zone (like hero) and already has a card
            const targetZoneData = zones.find(z => z.slug === targetZoneSlug);
            const targetZoneCards = deckCards.find(zc => zc.zone.slug === targetZoneSlug);
            if (targetZoneData?.max_cards === 1 && targetZoneCards && targetZoneCards.cards.length > 0) {
                toast.error('Dieser Bereich ist bereits belegt', {
                    description: `Der ${targetZoneData.name}-Bereich kann nur eine Karte enthalten.`,
                });
                return;
            }

            try {
                const response = await fetch(`/g/${game.slug}/decks/${deck.id}/cards/${activeCardId}/move`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ target_zone: targetZoneSlug }),
                });

                const data: DeckBuilderResponse = await response.json();
                if (data.success && data.deckCard) {
                    setDeckCards((prev) => {
                        // Find and preserve the owned_quantity from the moved card
                        let ownedQty = 0;
                        for (const zc of prev) {
                            const movedCard = zc.cards.find((c) => c.id === activeCardId);
                            if (movedCard?.owned_quantity !== undefined) {
                                ownedQty = movedCard.owned_quantity;
                                break;
                            }
                        }

                        const newState = prev.map((zc) => ({
                            ...zc,
                            cards: zc.cards.filter((c) => c.id !== activeCardId),
                            count: 0,
                        }));

                        const targetIdx = newState.findIndex((zc) => zc.zone.slug === targetZoneSlug);
                        if (targetIdx >= 0) {
                            newState[targetIdx].cards.push({
                                ...data.deckCard!,
                                owned_quantity: ownedQty,
                            });
                        }

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
        }
    };

    // Update local state from API response
    const updateLocalState = (data: DeckBuilderResponse) => {
        if (data.deckCard) {
            const deckCard = data.deckCard;
            setDeckCards((prev) => {
                const newState = [...prev];
                const zoneIdx = newState.findIndex((zc) => zc.zone.id === deckCard.deck_zone_id);
                if (zoneIdx >= 0) {
                    const existingIdx = newState[zoneIdx].cards.findIndex((c) => c.id === deckCard.id);
                    if (existingIdx >= 0) {
                        // Preserve owned_quantity when updating existing card
                        const existingOwnedQty = newState[zoneIdx].cards[existingIdx].owned_quantity;
                        newState[zoneIdx].cards[existingIdx] = {
                            ...deckCard,
                            owned_quantity: existingOwnedQty,
                        };
                    } else {
                        // For new cards, try to find owned_quantity from search results or existing cards
                        const printingId = deckCard.printing_id;
                        let ownedQty = 0;

                        // Check search results for owned_quantity
                        const searchResult = searchResults.find(p => p.id === printingId);
                        if (searchResult?.owned_quantity !== undefined) {
                            ownedQty = searchResult.owned_quantity;
                        } else {
                            // Check existing deck cards for same printing
                            for (const zc of prev) {
                                const existingCard = zc.cards.find(c => c.printing_id === printingId);
                                if (existingCard?.owned_quantity !== undefined) {
                                    ownedQty = existingCard.owned_quantity;
                                    break;
                                }
                            }
                        }

                        newState[zoneIdx].cards.push({
                            ...deckCard,
                            owned_quantity: ownedQty,
                        });
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
                <div className="relative flex h-[calc(100vh-8rem)] flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 z-10 flex items-center justify-between border-b px-4 py-2 backdrop-blur">
                        <div className="flex items-center gap-4">
                            <Link href={`/g/${game.slug}/decks/${deck.id}`}>
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div className="flex items-center gap-2">
                                <div>
                                    <h1 className="text-lg font-bold">{deck.name}</h1>
                                    <p className="text-muted-foreground text-xs">{deck.game_format?.name}</p>
                                </div>
                                <Link href={`/g/${game.slug}/decks/${deck.id}/edit`}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                            </div>

                            {/* Single-Card Zones (Hero) in Header */}
                            {deckCards
                                .filter(({ zone }) => zone.max_cards === 1)
                                .map(({ zone, cards }) => (
                                    <DroppableZone key={zone.id} zoneSlug={zone.slug} className="min-h-0 border-0 p-0">
                                        <div className="group/hero relative">
                                            {cards.length === 0 ? (
                                                <div className="border-muted-foreground/30 rounded border-2 border-dashed px-3 py-1">
                                                    <span className="text-muted-foreground/50 text-sm">Hero wählen...</span>
                                                </div>
                                            ) : (
                                                cards.slice(0, 1).map((card) => (
                                                    <div key={card.id} className="relative">
                                                        {/* Hero name as text - click for preview */}
                                                        <div
                                                            className="cursor-pointer rounded bg-primary/10 px-3 py-1 transition-colors hover:bg-primary/20"
                                                            onClick={() => card.printing && setPreviewCard(card.printing)}
                                                        >
                                                            <span className="text-sm font-medium">
                                                                {card.printing?.card?.name || 'Hero'}
                                                            </span>
                                                        </div>
                                                        {/* Hover preview with image and controls */}
                                                        <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 opacity-0 transition-opacity duration-200 group-hover/hero:pointer-events-auto group-hover/hero:opacity-100">
                                                            <div className="rounded-lg bg-black/95 p-3 shadow-2xl">
                                                                <CardThumbnail
                                                                    printing={card.printing!}
                                                                    size="lg"
                                                                    onClick={() => card.printing && setPreviewCard(card.printing)}
                                                                />
                                                                <p className="mt-2 max-w-[144px] truncate text-center text-xs font-medium text-white">
                                                                    {card.printing?.card?.name}
                                                                </p>
                                                                {/* Delete button */}
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    className="mt-2 w-full gap-1"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveCard(card);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                    Entfernen
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </DroppableZone>
                                ))}
                        </div>

                        {/* Center: Stats Summary */}
                        <div className="flex items-center gap-4">
                            <Badge
                                variant={validation.valid ? 'default' : 'destructive'}
                                className="gap-1.5 px-3 py-1"
                            >
                                {validation.valid ? (
                                    <CheckCircle className="h-3.5 w-3.5" />
                                ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                )}
                                {statistics.total_cards} Karten
                            </Badge>

                            {/* Validation Errors with Tooltip */}
                            {!validation.valid && validation.errors.length > 0 && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="text-destructive flex cursor-help items-center gap-1 text-xs">
                                            <XCircle className="h-3.5 w-3.5" />
                                            {validation.errors.length} Fehler
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-destructive max-w-xs">
                                        <ul className="space-y-1">
                                            {validation.errors.map((error, i) => (
                                                <li key={i}>• {error.message}</li>
                                            ))}
                                        </ul>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Import Dialog */}
                            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <FileUp className="h-4 w-4" />
                                        Import
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>Deckliste importieren</DialogTitle>
                                        <DialogDescription>
                                            Füge eine Deckliste im FaBrary-Format ein
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Textarea
                                        placeholder={`Hero: Dash I/O\n\nArena cards\n1x Teklo Foundry Heart\n\nDeck cards\n3x Zipper Hit (red)\n3x Throttle (blue)`}
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                        className="min-h-[300px] font-mono text-sm"
                                        disabled={importing}
                                    />
                                    {importing && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Importiere {importProgress.current} / {importProgress.total}...
                                            </div>
                                            <div className="bg-muted h-2 overflow-hidden rounded-full">
                                                <div
                                                    className="bg-primary h-full transition-all duration-300"
                                                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {importProgress.errors.length > 0 && (
                                        <div className="max-h-24 overflow-auto rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                                            <p className="font-medium">Nicht gefunden:</p>
                                            <ul className="mt-1 space-y-0.5">
                                                {importProgress.errors.map((err, i) => (
                                                    <li key={i}>• {err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setImportDialogOpen(false);
                                                setImportText('');
                                                setParsedImport(null);
                                                setImportProgress({ current: 0, total: 0, errors: [] });
                                            }}
                                            disabled={importing}
                                        >
                                            Abbrechen
                                        </Button>
                                        <Button onClick={handleImport} disabled={importing || !importText.trim()}>
                                            {importing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Importiere...
                                                </>
                                            ) : (
                                                'Importieren'
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <a href={`/g/${game.slug}/decks/${deck.id}/export/txt`} download>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Download className="h-4 w-4" />
                                    Export
                                </Button>
                            </a>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={deck.is_inventory_active ? 'default' : 'outline'}
                                        size="sm"
                                        className={cn("gap-2", deck.is_inventory_active && "bg-amber-500 hover:bg-amber-600 text-white")}
                                        disabled={isMarkingInDeck}
                                        onClick={() => {
                                            setIsMarkingInDeck(true);
                                            if (deck.is_inventory_active) {
                                                router.delete(
                                                    `/g/${game.slug}/decks/${deck.id}/mark-in-deck`,
                                                    {
                                                        preserveScroll: true,
                                                        onFinish: () => setIsMarkingInDeck(false),
                                                    }
                                                );
                                            } else {
                                                router.post(
                                                    `/g/${game.slug}/decks/${deck.id}/mark-in-deck`,
                                                    {},
                                                    {
                                                        preserveScroll: true,
                                                        onFinish: () => setIsMarkingInDeck(false),
                                                    }
                                                );
                                            }
                                        }}
                                    >
                                        {isMarkingInDeck ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Package className="h-4 w-4" />
                                        )}
                                        {deck.is_inventory_active ? 'Im Deck aktiv' : 'Im Deck'}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {deck.is_inventory_active
                                        ? 'Klicken um Inventar-Markierung aufzuheben'
                                        : 'Karten aus der Sammlung als "im Deck" markieren'}
                                </TooltipContent>
                            </Tooltip>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSearchPanelOpen(!searchPanelOpen)}
                                className="gap-2"
                            >
                                {searchPanelOpen ? (
                                    <>
                                        <PanelRightClose className="h-4 w-4" />
                                        Suche
                                    </>
                                ) : (
                                    <>
                                        <PanelRightOpen className="h-4 w-4" />
                                        Suche
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex min-h-0 flex-1">
                        {/* Deck Zones - Main Area */}
                        <div className={cn(
                            "flex-1 overflow-auto p-4 transition-all duration-300",
                            searchPanelOpen ? "mr-80" : "mr-0"
                        )}>
                            {/* Multi-Card Zones that count towards deck (Main Deck, Equipment, Sideboard) */}
                            <div className="flex gap-4">
                                {deckCards
                                    .filter(({ zone }) => zone.max_cards !== 1 && zone.counts_towards_deck)
                                    .map(({ zone, cards, count }) => (
                                    <Card key={zone.id} className="flex min-w-[280px] flex-1 flex-col">
                                        {/* Zone Header */}
                                        <CardHeader className="py-2 px-3">
                                            <CardTitle className="flex items-center justify-between text-sm">
                                                <span className="font-semibold">{zone.name}</span>
                                                <Badge
                                                    variant={
                                                        (zone.is_required && count < zone.min_cards) ||
                                                        (zone.max_cards && count > zone.max_cards)
                                                            ? 'destructive'
                                                            : 'secondary'
                                                    }
                                                    className="text-xs"
                                                >
                                                    {count}
                                                    {zone.min_cards > 0 && `/${zone.min_cards}`}
                                                    {zone.max_cards && zone.min_cards !== zone.max_cards && `-${zone.max_cards}`}
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>

                                        {/* Zone Content - auto-fit grid for responsive card layout */}
                                        <CardContent className="flex-1 overflow-y-auto overflow-x-hidden p-0">
                                            <DroppableZone zoneSlug={zone.slug} className="min-h-full">
                                                {cards.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                                        <div className="text-muted-foreground/40 mb-2 text-3xl">📥</div>
                                                        <p className="text-muted-foreground text-sm">
                                                            Karten hierher ziehen
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <SortableContext
                                                        items={cards.map(c => `deck-${c.id}`)}
                                                        strategy={rectSortingStrategy}
                                                    >
                                                        <div className="grid gap-3 p-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                                                            {cards
                                                                .slice()
                                                                .sort((a, b) => a.position - b.position)
                                                                .map((card) => (
                                                                    <DeckCardItem
                                                                        key={card.id}
                                                                        card={card}
                                                                        onRemove={handleRemoveCard}
                                                                        onQuantityChange={handleQuantityChange}
                                                                        onPreview={setPreviewCard}
                                                                        onHoverPreview={showHoverPreview}
                                                                        onHoverLeave={hideHoverPreview}
                                                                        size="fill"
                                                                        zoneSlug={zone.slug}
                                                                    />
                                                                ))}
                                                        </div>
                                                    </SortableContext>
                                                )}
                                            </DroppableZone>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Maybe Zone - Non-counting zone at bottom */}
                            {deckCards
                                .filter(({ zone }) => !zone.counts_towards_deck)
                                .map(({ zone, cards, count }) => (
                                <Card key={zone.id} className="mt-4 border-dashed border-muted-foreground/30">
                                    <CardHeader className="py-2 px-3">
                                        <CardTitle className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground font-semibold">{zone.name}</span>
                                            <Badge variant="outline" className="text-xs text-muted-foreground">
                                                {count} Karten
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <DroppableZone zoneSlug={zone.slug} className="min-h-[80px]">
                                            {cards.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                                    <p className="text-muted-foreground/60 text-sm">
                                                        Karten hier ablegen für Ideen
                                                    </p>
                                                </div>
                                            ) : (
                                                <SortableContext
                                                    items={cards.map(c => `deck-${c.id}`)}
                                                    strategy={rectSortingStrategy}
                                                >
                                                    <div className="grid gap-3 p-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                                                        {cards
                                                            .slice()
                                                            .sort((a, b) => a.position - b.position)
                                                            .map((card) => (
                                                                <DeckCardItem
                                                                    key={card.id}
                                                                    card={card}
                                                                    onRemove={handleRemoveCard}
                                                                    onQuantityChange={handleQuantityChange}
                                                                    onPreview={setPreviewCard}
                                                                    onHoverPreview={showHoverPreview}
                                                                    onHoverLeave={hideHoverPreview}
                                                                    size="fill"
                                                                    zoneSlug={zone.slug}
                                                                />
                                                            ))}
                                                    </div>
                                                </SortableContext>
                                            )}
                                        </DroppableZone>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Search Slide-Out Panel */}
                        <div
                            className={cn(
                                "bg-background absolute inset-y-0 right-0 top-[57px] flex w-80 flex-col border-l shadow-lg transition-transform duration-300 ease-in-out",
                                searchPanelOpen ? "translate-x-0" : "translate-x-full"
                            )}
                        >
                            {/* Search Header */}
                            <div className="border-b p-3">
                                <h2 className="font-semibold">Karten suchen</h2>
                            </div>

                            {/* Search Input */}
                            <div className="flex gap-2 p-3">
                                <Input
                                    placeholder="Kartenname..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Button onClick={handleSearch} disabled={searching} size="icon">
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Collection Filter Toggle */}
                            <div className="flex gap-1 px-3 pb-2">
                                <Button
                                    variant={collectionOnly ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        setCollectionOnly(!collectionOnly);
                                        // Re-search with new filter if we have a search query
                                        if (searchQuery.trim()) {
                                            setTimeout(() => handleSearch(), 0);
                                        }
                                    }}
                                    className="flex-1 gap-1.5 text-xs"
                                >
                                    <Library className="h-3.5 w-3.5" />
                                    {collectionOnly ? 'Nur Sammlung' : 'Alle Karten'}
                                </Button>
                            </div>

                            {/* Zone Selection */}
                            <div className="flex gap-1 px-3 pb-2">
                                {zones.map((zone) => (
                                    <Button
                                        key={zone.slug}
                                        variant={selectedZone === zone.slug ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedZone(zone.slug)}
                                        className="flex-1 text-xs"
                                    >
                                        {zone.name}
                                    </Button>
                                ))}
                            </div>

                            {/* Search Results */}
                            <div className="relative flex-1 overflow-auto p-3">
                                {/* Loading State */}
                                {searching && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <CardThumbnailSkeleton key={i} size="lg" />
                                        ))}
                                    </div>
                                )}

                                {/* Empty State */}
                                {!searching && hasSearched && searchResults.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <SearchX className="text-muted-foreground mb-3 h-10 w-10" />
                                        <p className="text-muted-foreground text-sm">
                                            Keine Karten gefunden
                                        </p>
                                    </div>
                                )}

                                {/* Initial State */}
                                {!searching && !hasSearched && searchResults.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Search className="text-muted-foreground/40 mb-3 h-10 w-10" />
                                        <p className="text-muted-foreground text-sm">
                                            Suche nach Karten
                                        </p>
                                        <p className="text-muted-foreground/60 mt-1 text-xs">
                                            Ziehe Karten in eine Zone
                                        </p>
                                    </div>
                                )}

                                {/* Results Grid - 2 columns for better visibility */}
                                {!searching && searchResults.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {searchResults.map((printing) => (
                                            <div key={printing.id} className="group/search relative">
                                                <DraggableSearchCard
                                                    printing={printing}
                                                    onDirectAdd={handleAddCard}
                                                    size="lg"
                                                />
                                                {/* Preview Button - hover shows preview, click opens dialog */}
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover/search:opacity-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setPreviewCard(printing);
                                                    }}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onMouseEnter={(e) => showHoverPreview(printing, e)}
                                                    onMouseLeave={hideHoverPreview}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                {/* Owned Quantity Badge */}
                                                {printing.owned_quantity !== undefined && printing.owned_quantity > 0 && (
                                                    <div className="pointer-events-none absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-green-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white shadow backdrop-blur-sm">
                                                        <Library className="h-3 w-3" />
                                                        {printing.owned_quantity}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drag Overlay with Card Image */}
                <DragOverlay>
                    {activeItem && (
                        <div className="pointer-events-none opacity-90">
                            {activeItem.type === 'deck' && activeItem.card.printing && (
                                <CardThumbnail
                                    printing={activeItem.card.printing}
                                    size="lg"
                                    showQuantity={activeItem.card.quantity > 1 ? activeItem.card.quantity : undefined}
                                    className="shadow-2xl ring-2 ring-primary"
                                />
                            )}
                            {activeItem.type === 'search' && (
                                <CardThumbnail
                                    printing={activeItem.printing}
                                    size="lg"
                                    className="shadow-2xl ring-2 ring-primary"
                                />
                            )}
                        </div>
                    )}
                </DragOverlay>

                {/* Card Preview Dialog */}
                <Dialog open={previewCard !== null} onOpenChange={(open) => !open && setPreviewCard(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{previewCard?.card?.name}</DialogTitle>
                            {previewCard?.set_name && (
                                <DialogDescription>
                                    {previewCard.set_name} • {previewCard.collector_number}
                                </DialogDescription>
                            )}
                        </DialogHeader>
                        <div className="flex justify-center">
                            {previewCard?.image_url && (
                                <img
                                    src={previewCard.image_url}
                                    alt={previewCard.card?.name || 'Card'}
                                    className="max-h-[70vh] w-auto rounded-lg shadow-lg"
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Hover Preview Portal */}
                {hoverPreview && hoverPreview.printing.image_url && typeof document !== 'undefined' && createPortal(
                    <div
                        className="pointer-events-none"
                        style={{
                            position: 'fixed',
                            left: hoverPreview.position.left,
                            top: hoverPreview.position.top,
                            zIndex: 9999,
                        }}
                    >
                        <img
                            src={hoverPreview.printing.image_url}
                            alt={hoverPreview.printing.card?.name}
                            className="w-64 h-auto rounded-lg shadow-2xl ring-2 ring-white/20"
                        />
                    </div>,
                    document.body
                )}
            </DndContext>
        </AppLayout>
    );
}
