import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { index as customCardsIndex } from '@/routes/custom-cards';
import { type BreadcrumbItem, type PaginatedData } from '@/types';
import { getPitchColor } from '@/types/unified';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Game {
    id: number;
    slug: string;
    name: string;
}

interface FabPrinting {
    id: number;
    image_url: string | null;
}

interface LinkedFabCard {
    id: number;
    name: string;
    printings?: FabPrinting[];
}

interface CustomPrinting {
    id: number;
    set_name: string | null;
    collector_number: string | null;
    rarity: string | null;
    foiling: string | null;
    language: string;
    image_url: string | null;
}

interface CustomCard {
    id: number;
    name: string;
    types: string[] | null;
    traits: string[] | null;
    functional_text: string | null;
    notes: string | null;
    linked_fab_card_id: number | null;
    linked_fab_card: LinkedFabCard | null;
    game: Game;
    printings: CustomPrinting[];
}

interface Props {
    games: Game[];
    selectedGameId: number | null;
    cards: PaginatedData<CustomCard>;
    filters: {
        search?: string;
    };
    rarities: Record<string, string>;
    foilings: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Eigene Karten',
        href: customCardsIndex().url,
    },
];

export default function CustomCardsIndex({ games, selectedGameId, cards, filters, rarities, foilings }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<CustomCard | null>(null);
    const [addPrintingToCard, setAddPrintingToCard] = useState<CustomCard | null>(null);
    const [editingPrinting, setEditingPrinting] = useState<{ printing: CustomPrinting; card: CustomCard } | null>(null);

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            customCardsIndex().url,
            { game: selectedGameId?.toString(), search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleGameChange = (gameId: string) => {
        router.get(customCardsIndex().url, { game: gameId }, { preserveState: true });
    };

    const handleDeleteCard = (card: CustomCard) => {
        if (!confirm(`"${card.name}" und alle zugehörigen Printings wirklich löschen?`)) return;
        router.delete(`/custom-cards/${card.id}`);
    };

    const handleDeletePrinting = (printing: CustomPrinting) => {
        if (!confirm('Dieses Printing wirklich löschen?')) return;
        router.delete(`/custom-printings/${printing.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Eigene Karten" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Eigene Karten</h1>
                        <p className="text-muted-foreground">
                            Verwalte deine manuell erstellten Karten
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Neue Karte
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <Input
                            placeholder="Karte suchen..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                    <Select
                        value={selectedGameId?.toString() ?? ''}
                        onValueChange={handleGameChange}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Spiel wählen" />
                        </SelectTrigger>
                        <SelectContent>
                            {games.map((game) => (
                                <SelectItem key={game.id} value={game.id.toString()}>
                                    {game.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Cards List */}
                {cards.data.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-12">
                        <div className="text-center">
                            <p className="text-lg font-medium">Keine eigenen Karten</p>
                            <p className="text-muted-foreground">
                                Du hast noch keine eigenen Karten für dieses Spiel erstellt.
                            </p>
                            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Erste Karte erstellen
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cards.data.map((card) => (
                            <div key={card.id} className="rounded-lg border p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{card.name}</h3>
                                            <Badge variant="outline">{card.game.name}</Badge>
                                        </div>
                                        {card.types && card.types.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {card.types.map((type, i) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                        {type}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        {card.functional_text && (
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {card.functional_text}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingCard(card)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteCard(card)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Printings */}
                                {card.printings.length > 0 && (
                                    <div className="mt-4 border-t pt-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-sm font-medium">Printings</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setAddPrintingToCard(card)}
                                            >
                                                <Plus className="mr-1 h-3 w-3" />
                                                Printing
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {card.printings.map((printing) => {
                                                // Image priority: custom > parent > placeholder
                                                const imageUrl = printing.image_url
                                                    ?? card.linked_fab_card?.printings?.[0]?.image_url
                                                    ?? null;

                                                return (
                                                    <div
                                                        key={printing.id}
                                                        className="flex items-center gap-3 rounded bg-muted/50 px-3 py-2"
                                                    >
                                                        <CardImage
                                                            src={imageUrl}
                                                            alt={card.name}
                                                            className="h-12 w-auto rounded"
                                                            placeholderClassName="h-12 w-9 rounded"
                                                        />
                                                        <div className="flex flex-1 items-center gap-2 text-sm">
                                                            {printing.set_name && (
                                                                <span>{printing.set_name}</span>
                                                            )}
                                                            {printing.collector_number && (
                                                                <span className="text-muted-foreground">
                                                                    #{printing.collector_number}
                                                                </span>
                                                            )}
                                                            {printing.rarity && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {rarities[printing.rarity] ?? printing.rarity}
                                                                </Badge>
                                                            )}
                                                            {printing.foiling && printing.foiling !== 'S' && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {foilings[printing.foiling] ?? printing.foiling}
                                                                </Badge>
                                                            )}
                                                            {printing.image_url && (
                                                                <Badge variant="default" className="text-xs">
                                                                    Eigenes Bild
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => setEditingPrinting({ printing, card })}
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => handleDeletePrinting(printing)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {card.printings.length === 0 && (
                                    <div className="mt-4 border-t pt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAddPrintingToCard(card)}
                                        >
                                            <Plus className="mr-1 h-3 w-3" />
                                            Printing hinzufügen
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Pagination */}
                        {cards.last_page > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!cards.prev_page_url}
                                    asChild={!!cards.prev_page_url}
                                >
                                    {cards.prev_page_url ? (
                                        <Link href={cards.prev_page_url}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Link>
                                    ) : (
                                        <span><ChevronLeft className="h-4 w-4" /></span>
                                    )}
                                </Button>
                                <span className="text-sm">
                                    Seite {cards.current_page} von {cards.last_page}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!cards.next_page_url}
                                    asChild={!!cards.next_page_url}
                                >
                                    {cards.next_page_url ? (
                                        <Link href={cards.next_page_url}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    ) : (
                                        <span><ChevronRight className="h-4 w-4" /></span>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Card Dialog */}
            <CreateCardDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                games={games}
                selectedGameId={selectedGameId}
                rarities={rarities}
                foilings={foilings}
            />

            {/* Edit Card Dialog */}
            <EditCardDialog
                isOpen={editingCard !== null}
                onClose={() => setEditingCard(null)}
                card={editingCard}
            />

            {/* Add Printing Dialog */}
            <AddPrintingDialog
                isOpen={addPrintingToCard !== null}
                onClose={() => setAddPrintingToCard(null)}
                card={addPrintingToCard}
                rarities={rarities}
                foilings={foilings}
            />

            {/* Edit Printing Dialog */}
            <EditPrintingDialog
                key={editingPrinting?.printing.id ?? 'new'}
                isOpen={editingPrinting !== null}
                onClose={() => setEditingPrinting(null)}
                printing={editingPrinting?.printing ?? null}
                card={editingPrinting?.card ?? null}
                rarities={rarities}
                foilings={foilings}
            />
        </AppLayout>
    );
}

function CreateCardDialog({
    isOpen,
    onClose,
    games,
    selectedGameId,
    rarities,
    foilings,
}: {
    isOpen: boolean;
    onClose: () => void;
    games: Game[];
    selectedGameId: number | null;
    rarities: Record<string, string>;
    foilings: Record<string, string>;
}) {
    const [fabCardSearch, setFabCardSearch] = useState('');
    const [fabCardResults, setFabCardResults] = useState<{
        id: number;
        name: string;
        pitch: number | null;
        collector_number: string | null;
        image_url: string | null;
    }[]>([]);
    const [linkedFabCard, setLinkedFabCard] = useState<{
        id: number;
        name: string;
        pitch?: number | null;
        collector_number?: string | null;
    } | null>(null);
    const [hoveredCard, setHoveredCard] = useState<{ image_url: string | null } | null>(null);

    const { data, setData, post, processing, reset, errors } = useForm({
        game_id: selectedGameId ?? games[0]?.id ?? 0,
        name: '',
        linked_fab_card_id: null as number | null,
        types: '',
        traits: '',
        functional_text: '',
        notes: '',
        set_name: '',
        collector_number: '',
        rarity: '',
        foiling: '',
    });

    const debouncedFabSearch = useDebouncedCallback(async (query: string) => {
        if (query.length < 2) {
            setFabCardResults([]);
            return;
        }
        try {
            const response = await fetch(`/custom-cards/fab-cards/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            setFabCardResults(results);
        } catch (error) {
            console.error('Error searching FAB cards:', error);
        }
    }, 300);

    const handleFabCardSearch = (query: string) => {
        setFabCardSearch(query);
        debouncedFabSearch(query);
    };

    const selectLinkedCard = (fabCard: { id: number; name: string; pitch?: number | null; collector_number?: string | null }) => {
        setLinkedFabCard(fabCard);
        setData('linked_fab_card_id', fabCard.id);
        setFabCardSearch('');
        setFabCardResults([]);
        setHoveredCard(null);
    };

    const removeLinkedCard = () => {
        setLinkedFabCard(null);
        setData('linked_fab_card_id', null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/custom-cards/create', {
            data: {
                ...data,
                types: data.types ? data.types.split(',').map((t) => t.trim()) : null,
                traits: data.traits ? data.traits.split(',').map((t) => t.trim()) : null,
            },
            onSuccess: () => {
                reset();
                setLinkedFabCard(null);
                setFabCardSearch('');
                setFabCardResults([]);
                onClose();
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Neue Karte erstellen</DialogTitle>
                    <DialogDescription>
                        Erstelle eine eigene Karte, die nicht in der Datenbank vorhanden ist.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <Label htmlFor="game_id">Spiel</Label>
                            <Select
                                value={data.game_id.toString()}
                                onValueChange={(v) => setData('game_id', Number(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {games.map((game) => (
                                        <SelectItem key={game.id} value={game.id.toString()}>
                                            {game.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="sm:col-span-2">
                            <Label htmlFor="name">Kartenname *</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>

                        {/* Linked FAB Card */}
                        <div className="sm:col-span-2">
                            <Label>Verknüpfte FAB Karte (für Bild)</Label>
                            {linkedFabCard ? (
                                <div className="flex items-center gap-2 mt-1 p-2 border rounded-md bg-muted/50">
                                    <span
                                        className={`inline-block h-3 w-3 rounded-full shrink-0 ${
                                            getPitchColor(linkedFabCard.pitch ?? null) === 'red'
                                                ? 'bg-red-500'
                                                : getPitchColor(linkedFabCard.pitch ?? null) === 'yellow'
                                                  ? 'bg-yellow-500'
                                                  : getPitchColor(linkedFabCard.pitch ?? null) === 'blue'
                                                    ? 'bg-blue-500'
                                                    : 'bg-gray-400'
                                        }`}
                                    />
                                    <span className="flex-1 text-sm">
                                        {linkedFabCard.name}
                                        {linkedFabCard.collector_number && (
                                            <span className="text-muted-foreground ml-1">
                                                ({linkedFabCard.collector_number})
                                            </span>
                                        )}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={removeLinkedCard}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        placeholder="FAB Karte suchen..."
                                        value={fabCardSearch}
                                        onChange={(e) => handleFabCardSearch(e.target.value)}
                                    />
                                    {fabCardResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {fabCardResults.map((result) => {
                                                const pitchColor = getPitchColor(result.pitch);
                                                return (
                                                    <button
                                                        key={result.id}
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                                                        onClick={() => selectLinkedCard(result)}
                                                        onMouseEnter={() => setHoveredCard(result)}
                                                        onMouseLeave={() => setHoveredCard(null)}
                                                    >
                                                        <span
                                                            className={`inline-block h-3 w-3 rounded-full shrink-0 ${
                                                                pitchColor === 'red'
                                                                    ? 'bg-red-500'
                                                                    : pitchColor === 'yellow'
                                                                      ? 'bg-yellow-500'
                                                                      : pitchColor === 'blue'
                                                                        ? 'bg-blue-500'
                                                                        : 'bg-gray-400'
                                                            }`}
                                                        />
                                                        <span className="flex-1">{result.name}</span>
                                                        {result.collector_number && (
                                                            <span className="text-muted-foreground text-xs">
                                                                {result.collector_number}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {/* Image preview on hover */}
                                    {hoveredCard?.image_url && (
                                        <div className="absolute right-0 top-full mt-1 z-20 pointer-events-none">
                                            <img
                                                src={hoveredCard.image_url}
                                                alt="Vorschau"
                                                className="h-48 w-auto rounded-lg shadow-xl border"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="types">Typen (kommagetrennt)</Label>
                            <Input
                                id="types"
                                value={data.types}
                                onChange={(e) => setData('types', e.target.value)}
                                placeholder="Action, Attack"
                            />
                        </div>

                        <div>
                            <Label htmlFor="traits">Merkmale (kommagetrennt)</Label>
                            <Input
                                id="traits"
                                value={data.traits}
                                onChange={(e) => setData('traits', e.target.value)}
                                placeholder="Ninja, Shadow"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <Label htmlFor="functional_text">Kartentext</Label>
                            <Textarea
                                id="functional_text"
                                value={data.functional_text}
                                onChange={(e) => setData('functional_text', e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <p className="mb-3 text-sm font-medium">Erstes Printing (optional)</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="set_name">Set</Label>
                                <Input
                                    id="set_name"
                                    value={data.set_name}
                                    onChange={(e) => setData('set_name', e.target.value)}
                                    placeholder="Welcome to Rathe"
                                />
                            </div>
                            <div>
                                <Label htmlFor="collector_number">Nummer</Label>
                                <Input
                                    id="collector_number"
                                    value={data.collector_number}
                                    onChange={(e) => setData('collector_number', e.target.value)}
                                    placeholder="WTR001"
                                />
                            </div>
                            <div>
                                <Label htmlFor="rarity">Seltenheit</Label>
                                <Select
                                    value={data.rarity}
                                    onValueChange={(v) => setData('rarity', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Wählen..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(rarities).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="foiling">Foiling</Label>
                                <Select
                                    value={data.foiling}
                                    onValueChange={(v) => setData('foiling', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Wählen..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(foilings).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Erstellen
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditCardDialog({
    isOpen,
    onClose,
    card,
}: {
    isOpen: boolean;
    onClose: () => void;
    card: CustomCard | null;
}) {
    const [fabCardSearch, setFabCardSearch] = useState('');
    const [fabCardResults, setFabCardResults] = useState<{
        id: number;
        name: string;
        pitch: number | null;
        collector_number: string | null;
        image_url: string | null;
    }[]>([]);
    const [linkedFabCard, setLinkedFabCard] = useState<{
        id: number;
        name: string;
        pitch?: number | null;
        collector_number?: string | null;
    } | null>(null);
    const [hoveredCard, setHoveredCard] = useState<{ image_url: string | null } | null>(null);

    const { data, setData, patch, processing, reset } = useForm({
        name: '',
        linked_fab_card_id: null as number | null,
        types: '',
        traits: '',
        functional_text: '',
        notes: '',
    });

    // Reset form data when card changes
    useEffect(() => {
        if (card) {
            setData({
                name: card.name ?? '',
                linked_fab_card_id: card.linked_fab_card_id ?? null,
                types: card.types?.join(', ') ?? '',
                traits: card.traits?.join(', ') ?? '',
                functional_text: card.functional_text ?? '',
                notes: card.notes ?? '',
            });
            setLinkedFabCard(
                card.linked_fab_card
                    ? { id: card.linked_fab_card.id, name: card.linked_fab_card.name }
                    : null
            );
            setFabCardSearch('');
            setFabCardResults([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [card]);

    const debouncedFabSearch = useDebouncedCallback(async (query: string) => {
        if (query.length < 2) {
            setFabCardResults([]);
            return;
        }
        try {
            const response = await fetch(`/custom-cards/fab-cards/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            setFabCardResults(results);
        } catch (error) {
            console.error('Error searching FAB cards:', error);
        }
    }, 300);

    const handleFabCardSearch = (query: string) => {
        setFabCardSearch(query);
        debouncedFabSearch(query);
    };

    const selectLinkedCard = (fabCard: { id: number; name: string; pitch?: number | null; collector_number?: string | null }) => {
        setLinkedFabCard(fabCard);
        setData('linked_fab_card_id', fabCard.id);
        setFabCardSearch('');
        setFabCardResults([]);
        setHoveredCard(null);
    };

    const removeLinkedCard = () => {
        setLinkedFabCard(null);
        setData('linked_fab_card_id', null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!card) return;
        patch(`/custom-cards/${card.id}`, {
            data: {
                ...data,
                types: data.types ? data.types.split(',').map((t) => t.trim()) : null,
                traits: data.traits ? data.traits.split(',').map((t) => t.trim()) : null,
            },
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    if (!card) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Karte bearbeiten</DialogTitle>
                    <DialogDescription>
                        Bearbeite die Karteninformationen.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="edit-name">Kartenname</Label>
                        <Input
                            id="edit-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                    </div>

                    {/* Linked FAB Card */}
                    <div>
                        <Label>Verknüpfte Karte (für Bild)</Label>
                        {linkedFabCard ? (
                            <div className="flex items-center gap-2 mt-1 p-2 border rounded-md bg-muted/50">
                                <span
                                    className={`inline-block h-3 w-3 rounded-full shrink-0 ${
                                        getPitchColor(linkedFabCard.pitch ?? null) === 'red'
                                            ? 'bg-red-500'
                                            : getPitchColor(linkedFabCard.pitch ?? null) === 'yellow'
                                              ? 'bg-yellow-500'
                                              : getPitchColor(linkedFabCard.pitch ?? null) === 'blue'
                                                ? 'bg-blue-500'
                                                : 'bg-gray-400'
                                    }`}
                                />
                                <span className="flex-1 text-sm">
                                    {linkedFabCard.name}
                                    {linkedFabCard.collector_number && (
                                        <span className="text-muted-foreground ml-1">
                                            ({linkedFabCard.collector_number})
                                        </span>
                                    )}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={removeLinkedCard}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Input
                                    placeholder="FAB Karte suchen..."
                                    value={fabCardSearch}
                                    onChange={(e) => handleFabCardSearch(e.target.value)}
                                />
                                {fabCardResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {fabCardResults.map((result) => {
                                            const pitchColor = getPitchColor(result.pitch);
                                            return (
                                                <button
                                                    key={result.id}
                                                    type="button"
                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                                                    onClick={() => selectLinkedCard(result)}
                                                    onMouseEnter={() => setHoveredCard(result)}
                                                    onMouseLeave={() => setHoveredCard(null)}
                                                >
                                                    <span
                                                        className={`inline-block h-3 w-3 rounded-full shrink-0 ${
                                                            pitchColor === 'red'
                                                                ? 'bg-red-500'
                                                                : pitchColor === 'yellow'
                                                                  ? 'bg-yellow-500'
                                                                  : pitchColor === 'blue'
                                                                    ? 'bg-blue-500'
                                                                    : 'bg-gray-400'
                                                        }`}
                                                    />
                                                    <span className="flex-1">{result.name}</span>
                                                    {result.collector_number && (
                                                        <span className="text-muted-foreground text-xs">
                                                            {result.collector_number}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Image preview on hover */}
                                {hoveredCard?.image_url && (
                                    <div className="absolute right-0 top-full mt-1 z-20 pointer-events-none">
                                        <img
                                            src={hoveredCard.image_url}
                                            alt="Vorschau"
                                            className="h-48 w-auto rounded-lg shadow-xl border"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Das Bild der verknüpften Karte wird verwendet, wenn kein eigenes Bild hochgeladen wurde.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="edit-types">Typen (kommagetrennt)</Label>
                            <Input
                                id="edit-types"
                                value={data.types}
                                onChange={(e) => setData('types', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-traits">Merkmale (kommagetrennt)</Label>
                            <Input
                                id="edit-traits"
                                value={data.traits}
                                onChange={(e) => setData('traits', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="edit-text">Kartentext</Label>
                        <Textarea
                            id="edit-text"
                            value={data.functional_text}
                            onChange={(e) => setData('functional_text', e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label htmlFor="edit-notes">Notizen</Label>
                        <Textarea
                            id="edit-notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={2}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Speichern
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AddPrintingDialog({
    isOpen,
    onClose,
    card,
    rarities,
    foilings,
}: {
    isOpen: boolean;
    onClose: () => void;
    card: CustomCard | null;
    rarities: Record<string, string>;
    foilings: Record<string, string>;
}) {
    const { data, setData, post, processing, reset } = useForm({
        set_name: '',
        collector_number: '',
        rarity: '',
        foiling: '',
        language: 'EN',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!card) return;
        post(`/custom-cards/${card.id}/printings`, {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    if (!card) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Printing hinzufügen</DialogTitle>
                    <DialogDescription>
                        Füge ein neues Printing zu &quot;{card.name}&quot; hinzu.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="print-set">Set</Label>
                            <Input
                                id="print-set"
                                value={data.set_name}
                                onChange={(e) => setData('set_name', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="print-number">Nummer</Label>
                            <Input
                                id="print-number"
                                value={data.collector_number}
                                onChange={(e) => setData('collector_number', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="print-rarity">Seltenheit</Label>
                            <Select
                                value={data.rarity}
                                onValueChange={(v) => setData('rarity', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(rarities).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="print-foiling">Foiling</Label>
                            <Select
                                value={data.foiling}
                                onValueChange={(v) => setData('foiling', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(foilings).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Hinzufügen
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditPrintingDialog({
    isOpen,
    onClose,
    printing,
    card,
    rarities,
    foilings,
}: {
    isOpen: boolean;
    onClose: () => void;
    printing: CustomPrinting | null;
    card: CustomCard | null;
    rarities: Record<string, string>;
    foilings: Record<string, string>;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Initialize form with printing data (component is keyed by printing.id)
    const [formData, setFormData] = useState({
        set_name: printing?.set_name ?? '',
        collector_number: printing?.collector_number ?? '',
        rarity: printing?.rarity ?? '',
        foiling: printing?.foiling ?? '',
        language: printing?.language ?? 'EN',
    });

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setRemoveImage(false);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setPreviewUrl(null);
        setRemoveImage(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!printing) return;

        setSubmitting(true);

        const data = new FormData();
        data.append('set_name', formData.set_name);
        data.append('collector_number', formData.collector_number);
        data.append('rarity', formData.rarity);
        data.append('foiling', formData.foiling);
        data.append('language', formData.language);

        if (selectedImage) {
            data.append('image', selectedImage);
        }
        if (removeImage) {
            data.append('remove_image', '1');
        }

        router.post(`/custom-printings/${printing.id}`, data, {
            forceFormData: true,
            onSuccess: () => {
                setSelectedImage(null);
                setPreviewUrl(null);
                setRemoveImage(false);
                onClose();
            },
            onFinish: () => {
                setSubmitting(false);
            },
        });
    };

    if (!printing || !card) return null;

    // Image priority for preview: selected > current custom > parent > placeholder
    const currentImageUrl = previewUrl
        ?? (removeImage ? null : printing.image_url)
        ?? card.linked_fab_card?.printings?.[0]?.image_url
        ?? null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Printing bearbeiten</DialogTitle>
                    <DialogDescription>
                        Bearbeite das Printing von &quot;{card.name}&quot;.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Image Upload Section */}
                    <div>
                        <Label>Kartenbild</Label>
                        <div className="mt-2 flex items-start gap-4">
                            <div className="relative">
                                <CardImage
                                    src={currentImageUrl}
                                    alt={card.name}
                                    className="h-32 w-24 rounded-lg object-cover border"
                                    placeholderClassName="h-32 w-24 rounded-lg border"
                                />
                                {(printing.image_url || previewUrl) && !removeImage && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                        onClick={handleRemoveImage}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full"
                                >
                                    <ImagePlus className="mr-2 h-4 w-4" />
                                    Bild hochladen
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Max. 5MB. JPG, PNG oder WebP.
                                </p>
                                {printing.image_url && !removeImage && !previewUrl && (
                                    <Badge variant="secondary" className="text-xs">
                                        Eigenes Bild vorhanden
                                    </Badge>
                                )}
                                {removeImage && (
                                    <Badge variant="destructive" className="text-xs">
                                        Bild wird entfernt
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="edit-print-set">Set</Label>
                            <Input
                                id="edit-print-set"
                                value={formData.set_name}
                                onChange={(e) => setFormData({ ...formData, set_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-print-number">Nummer</Label>
                            <Input
                                id="edit-print-number"
                                value={formData.collector_number}
                                onChange={(e) => setFormData({ ...formData, collector_number: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-print-rarity">Seltenheit</Label>
                            <Select
                                value={formData.rarity}
                                onValueChange={(v) => setFormData({ ...formData, rarity: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(rarities).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="edit-print-foiling">Foiling</Label>
                            <Select
                                value={formData.foiling}
                                onValueChange={(v) => setFormData({ ...formData, foiling: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(foilings).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            Speichern
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
