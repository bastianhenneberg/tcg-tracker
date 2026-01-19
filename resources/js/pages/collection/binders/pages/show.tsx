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
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type UnifiedInventory } from '@/types/unified';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface StackedCardsProps {
    cards: UnifiedInventory[];
    onRemoveCard: (id: number) => void;
    isFull: boolean;
    onSlotClick: () => void;
}

function StackedCards({ cards, onRemoveCard, isFull, onSlotClick }: StackedCardsProps) {
    const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);

    // Calculate card height percentage based on number of cards
    const totalCards = cards.length;
    const overlapPercent = 18; // Percentage visible for each stacked card
    const cardHeightPercent = 100 - (totalCards - 1) * overlapPercent;

    return (
        <div className="group relative flex h-full w-full flex-col p-2">
            <div className="relative flex-1">
                {cards.map((item, index) => {
                    const isHovered = hoveredCardId === item.id;
                    const topOffset = index * overlapPercent;

                    return (
                        <div
                            key={item.id}
                            className="absolute inset-x-0 transition-all duration-200 ease-out"
                            style={{
                                top: `${topOffset}%`,
                                height: `${cardHeightPercent}%`,
                                zIndex: isHovered ? 50 : index,
                            }}
                            onMouseEnter={() => setHoveredCardId(item.id)}
                            onMouseLeave={() => setHoveredCardId(null)}
                        >
                            {item.printing?.image_url ? (
                                <img
                                    src={item.printing.image_url}
                                    alt={item.printing.card?.name ?? ''}
                                    className={`h-full w-full rounded object-contain transition-shadow duration-200 ${
                                        isHovered ? 'shadow-xl ring-2 ring-primary' : 'shadow'
                                    }`}
                                />
                            ) : (
                                <div className={`bg-muted text-muted-foreground flex h-full w-full items-center justify-center rounded text-center text-xs ${
                                    isHovered ? 'shadow-xl ring-2 ring-primary' : 'shadow'
                                }`}>
                                    {item.printing?.card?.name}
                                </div>
                            )}

                            {/* Hover overlay with delete button */}
                            {isHovered && (
                                <div className="absolute right-1 top-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveCard(item.id);
                                        }}
                                        className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Card Count Badge */}
            {cards.length > 1 && (
                <div className="absolute left-1.5 top-1.5 z-[60] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
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
            return; // Slot is full
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
                                Klicke auf einen Slot um Karten hinzuzufügen (max. 4 pro Slot)
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3x3 Binder Grid */}
                <Card className="border-2">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-3 gap-4">
                            {gridSlots.map((slot) => {
                                const slotCards = slots[slot] || [];
                                const hasCards = slotCards.length > 0;
                                const isFull = slotCards.length >= MAX_CARDS_PER_SLOT;

                                return (
                                    <div
                                        key={slot}
                                        className={`
                                            relative aspect-[2.5/3.5] overflow-hidden rounded-lg border-2 transition-all
                                            ${hasCards ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/20'}
                                            ${!isFull ? 'cursor-pointer hover:border-primary hover:bg-muted/40' : ''}
                                        `}
                                        onClick={() => handleSlotClick(slot)}
                                    >
                                        {hasCards ? (
                                            <StackedCards
                                                cards={slotCards}
                                                onRemoveCard={handleRemoveCard}
                                                isFull={isFull}
                                                onSlotClick={() => handleSlotClick(slot)}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                                                <Plus className="text-muted-foreground/50 h-8 w-8" />
                                                <span className="text-muted-foreground/50 text-xs">Slot {slot}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
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
