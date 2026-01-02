import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Game {
    id: number;
    slug: string;
    name: string;
}

interface Box {
    id: number;
    name: string;
}

interface Lot {
    id: number;
    lot_number: string;
    box?: Box;
}

interface CardMatch {
    id: number;
    card_id: number;
    card_name: string;
    set_name: string;
    collector_number: string;
    rarity: string | null;
    foiling: string | null;
    image_url: string | null;
    is_custom: boolean;
}

interface ScannerFlash {
    success?: string;
    error?: string;
}

interface Props {
    game: Game;
    lots: Lot[];
    boxes: Box[];
    conditions: Record<string, string>;
    foilings: Record<string, string>;
    rarities: Record<string, string>;
    searchResults: CardMatch[];
    searchQuery: string;
}

export default function GameScanner({ game, lots, boxes, conditions, foilings, rarities, searchResults: initialSearchResults, searchQuery: initialSearchQuery }: Props) {
    const { props } = usePage<{ flash?: ScannerFlash }>();
    const flash = props.flash;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/games/${game.slug}/cards` },
        { title: 'Scanner', href: `/games/${game.slug}/scanner` },
    ];

    // Lot state
    const [selectedLotId, setSelectedLotId] = useState<number | null>(lots[0]?.id ?? null);
    const [showCreateLot, setShowCreateLot] = useState(false);
    const [newLotBoxId, setNewLotBoxId] = useState<string>('');
    const [newLotNotes, setNewLotNotes] = useState('');
    const [creatingLot, setCreatingLot] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [searchResults, setSearchResults] = useState<CardMatch[]>(initialSearchResults);
    const [searching, setSearching] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState(0);

    // Selected card state
    const [selectedCard, setSelectedCard] = useState<CardMatch | null>(null);
    const [selectedCondition, setSelectedCondition] = useState<string>(Object.keys(conditions)[0] ?? 'NM');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('DE');
    const [confirming, setConfirming] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setSearchResults(initialSearchResults);
        setSearching(false);
    }, [initialSearchResults]);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
            setSelectedCard(null);
            setSearchQuery('');
            setSearchResults([]);
            searchInputRef.current?.focus();
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const debouncedSearch = useDebouncedCallback((query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        router.post(`/games/${game.slug}/scanner/search`, { q: query }, {
            preserveState: true,
            preserveScroll: true,
            only: ['searchResults'],
        });
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setSelectedResultIndex(0);
        if (value.length >= 2) {
            setSearching(true);
            debouncedSearch(value);
        } else {
            setSearchResults([]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (searchResults.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedResultIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedResultIndex((prev) => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (searchResults[selectedResultIndex]) {
                    selectCard(searchResults[selectedResultIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setSearchResults([]);
                break;
        }
    };

    const selectCard = (card: CardMatch) => {
        setSelectedCard(card);
        setSearchResults([]);
    };

    const handleConfirm = () => {
        if (!selectedCard || !selectedLotId) return;

        setConfirming(true);
        router.post(`/games/${game.slug}/scanner/confirm`, {
            lot_id: selectedLotId,
            custom_printing_id: selectedCard.id,
            condition: selectedCondition,
            language: selectedLanguage,
        }, {
            preserveScroll: true,
            onFinish: () => setConfirming(false),
        });
    };

    const handleCreateLot = () => {
        setCreatingLot(true);
        router.post(`/games/${game.slug}/scanner/lot`, {
            box_id: newLotBoxId || null,
            notes: newLotNotes || null,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowCreateLot(false);
                setNewLotBoxId('');
                setNewLotNotes('');
            },
            onFinish: () => setCreatingLot(false),
        });
    };

    const selectedLot = lots.find((l) => l.id === selectedLotId);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${game.name} Scanner`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:flex-row">
                {/* Left side - Search */}
                <div className="flex flex-1 flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Karte suchen
                            </CardTitle>
                            <CardDescription>
                                Suche nach Kartennamen in deinen {game.name} Karten
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Kartenname eingeben..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="pr-10"
                                />
                                {searching && (
                                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                                )}
                            </div>

                            {searchResults.length > 0 && (
                                <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border">
                                    {searchResults.map((result, index) => (
                                        <div
                                            key={result.id}
                                            className={`flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/50 ${
                                                index === selectedResultIndex ? 'bg-muted' : ''
                                            }`}
                                            onClick={() => selectCard(result)}
                                        >
                                            <CardImage
                                                src={result.image_url}
                                                alt={result.card_name}
                                                className="h-16 w-auto rounded"
                                                placeholderClassName="h-16 w-12 rounded"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium">{result.card_name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {result.set_name} - #{result.collector_number}
                                                </div>
                                                <div className="flex gap-1 mt-1">
                                                    {result.rarity && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {rarities[result.rarity] ?? result.rarity}
                                                        </Badge>
                                                    )}
                                                    {result.foiling && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {foilings[result.foiling] ?? result.foiling}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                                <div className="mt-2 text-center text-sm text-muted-foreground p-4">
                                    Keine Karten gefunden. Erstelle zuerst Karten unter "Eigene Karten".
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {selectedCard && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    Ausgewählte Karte
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    <CardImage
                                        src={selectedCard.image_url}
                                        alt={selectedCard.card_name}
                                        className="h-48 w-auto rounded-lg"
                                        placeholderClassName="h-48 w-36 rounded-lg"
                                    />
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h3 className="text-lg font-semibold">{selectedCard.card_name}</h3>
                                            <p className="text-muted-foreground">
                                                {selectedCard.set_name} - #{selectedCard.collector_number}
                                            </p>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <Label>Zustand</Label>
                                                <Select
                                                    value={selectedCondition}
                                                    onValueChange={setSelectedCondition}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(conditions).map(([key, label]) => (
                                                            <SelectItem key={key} value={key}>
                                                                {label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div>
                                                <Label>Sprache</Label>
                                                <Select
                                                    value={selectedLanguage}
                                                    onValueChange={setSelectedLanguage}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="DE">Deutsch</SelectItem>
                                                        <SelectItem value="EN">English</SelectItem>
                                                        <SelectItem value="FR">Français</SelectItem>
                                                        <SelectItem value="ES">Español</SelectItem>
                                                        <SelectItem value="IT">Italiano</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleConfirm}
                                            disabled={!selectedLotId || confirming}
                                            className="w-full"
                                        >
                                            {confirming ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Wird hinzugefügt...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Zum Inventar hinzufügen
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right side - Lot Selection */}
                <div className="w-full lg:w-80">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Aktuelles Lot</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => setShowCreateLot(true)}>
                                    <Plus className="mr-1 h-3 w-3" />
                                    Neues Lot
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Select
                                value={selectedLotId?.toString() ?? ''}
                                onValueChange={(v) => setSelectedLotId(parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Lot auswählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {lots.map((lot) => (
                                        <SelectItem key={lot.id} value={lot.id.toString()}>
                                            Lot #{lot.lot_number}
                                            {lot.box && ` (${lot.box.name})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedLot && (
                                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                                    <div className="text-sm font-medium">Lot #{selectedLot.lot_number}</div>
                                    {selectedLot.box && (
                                        <div className="text-sm text-muted-foreground">
                                            Box: {selectedLot.box.name}
                                        </div>
                                    )}
                                </div>
                            )}

                            {lots.length === 0 && (
                                <div className="mt-4 text-center text-sm text-muted-foreground">
                                    Noch keine Lots vorhanden.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {lots.length > 0 && (
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle className="text-base">Letzte Lots</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Lot</TableHead>
                                            <TableHead>Box</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lots.slice(0, 5).map((lot) => (
                                            <TableRow
                                                key={lot.id}
                                                className={`cursor-pointer ${selectedLotId === lot.id ? 'bg-muted' : ''}`}
                                                onClick={() => setSelectedLotId(lot.id)}
                                            >
                                                <TableCell>#{lot.lot_number}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {lot.box?.name ?? '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <Dialog open={showCreateLot} onOpenChange={setShowCreateLot}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Neues Lot erstellen</DialogTitle>
                        <DialogDescription>
                            Ein Lot ist eine Gruppe von Karten.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Box (optional)</Label>
                            <Select value={newLotBoxId} onValueChange={setNewLotBoxId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Keine Box" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Keine Box</SelectItem>
                                    {boxes.map((box) => (
                                        <SelectItem key={box.id} value={box.id.toString()}>
                                            {box.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Notizen (optional)</Label>
                            <Input
                                value={newLotNotes}
                                onChange={(e) => setNewLotNotes(e.target.value)}
                                placeholder="z.B. Kauf vom 01.01.2025"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateLot(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleCreateLot} disabled={creatingLot}>
                            {creatingLot ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Erstelle...
                                </>
                            ) : (
                                'Lot erstellen'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
