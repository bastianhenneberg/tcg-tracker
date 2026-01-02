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
import {
    type RiftboundConditionKey,
    type RiftboundFoilingKey,
    RIFTBOUND_CONDITIONS,
    RIFTBOUND_FOILINGS,
    getRiftboundRarityLabel,
    getRiftboundFoilingLabel,
} from '@/types/riftbound';
import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

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
    card_name: string;
    set_name: string;
    collector_number: string;
    rarity: string | null;
    rarity_label?: string;
    foiling: string | null;
    foiling_label?: string;
    image_url: string | null;
}

interface ScannedCard {
    id: number;
    card_name: string;
    position: number;
    condition: string;
}

interface ScannerFlash {
    success: boolean;
    error?: string;
    confirmed?: ScannedCard;
    lot_count?: number;
    newLot?: { id: number; lot_number: string; box_name?: string };
}

interface Props {
    lots: Lot[];
    boxes: Box[];
    conditions: Record<string, string>;
    foilings: Record<string, string>;
    searchResults: CardMatch[];
    searchQuery: string;
    scannerSettings: {
        bulkMode: {
            enabled: boolean;
            interval: number;
            defaultCondition: RiftboundConditionKey;
            defaultFoiling: RiftboundFoilingKey | null;
            defaultLanguage: string;
        };
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Riftbound',
        href: '/riftbound/cards',
    },
    {
        title: 'Scanner',
        href: '/riftbound/scanner',
    },
];

export default function RiftboundScanner({ lots, boxes, conditions, foilings, searchResults, searchQuery }: Props) {
    const { props } = usePage();
    const flash = props.flash as { scanner?: ScannerFlash } | undefined;
    const scannerFlash = flash?.scanner;

    const [selectedLotId, setSelectedLotId] = useState<number | null>(lots[0]?.id ?? null);
    const [selectedCard, setSelectedCard] = useState<CardMatch | null>(null);
    const [condition, setCondition] = useState<RiftboundConditionKey>('NM');
    const [language, setLanguage] = useState('EN');
    const [price, setPrice] = useState<string>('');
    const [recentScans, setRecentScans] = useState<ScannedCard[]>([]);
    const [search, setSearch] = useState(searchQuery);
    const [isSearching, setIsSearching] = useState(false);
    const [showNewLotDialog, setShowNewLotDialog] = useState(false);
    const [newLotBoxId, setNewLotBoxId] = useState<number | null>(null);
    const [newLotNotes, setNewLotNotes] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    // Handle flash messages
    useEffect(() => {
        if (scannerFlash?.success && scannerFlash.confirmed) {
            setRecentScans((prev) => [scannerFlash.confirmed!, ...prev.slice(0, 9)]);
            setSelectedCard(null);
            setPrice('');
            toast.success(`${scannerFlash.confirmed.card_name} hinzugefügt (Position ${scannerFlash.confirmed.position})`);
        }
        if (scannerFlash?.newLot) {
            setSelectedLotId(scannerFlash.newLot.id);
            toast.success(`Lot ${scannerFlash.newLot.lot_number} erstellt`);
            setShowNewLotDialog(false);
        }
        if (scannerFlash?.error) {
            toast.error(scannerFlash.error);
        }
        setIsConfirming(false);
    }, [scannerFlash]);

    const debouncedSearch = useDebouncedCallback((value: string) => {
        if (value.length >= 2) {
            setIsSearching(true);
            router.get(
                '/riftbound/scanner',
                { q: value },
                {
                    preserveState: true,
                    preserveScroll: true,
                    onFinish: () => setIsSearching(false),
                }
            );
        } else if (value.length === 0) {
            router.get('/riftbound/scanner', {}, { preserveState: true, preserveScroll: true });
        }
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleSelectCard = (card: CardMatch) => {
        setSelectedCard(card);
    };

    const handleConfirm = () => {
        if (!selectedCard || !selectedLotId) return;

        setIsConfirming(true);
        router.post('/riftbound/scanner/confirm', {
            lot_id: selectedLotId,
            riftbound_printing_id: selectedCard.id,
            condition,
            language,
            price: price ? parseFloat(price) : null,
        });
    };

    const handleCreateLot = () => {
        router.post('/riftbound/scanner/lot', {
            box_id: newLotBoxId,
            notes: newLotNotes || null,
        });
    };

    const selectedLot = lots.find((l) => l.id === selectedLotId);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Riftbound Scanner" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:flex-row">
                {/* Left: Search and Card Selection */}
                <div className="flex flex-1 flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Karte suchen
                            </CardTitle>
                            <CardDescription>
                                Suche nach Kartenname oder Nummer
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Input
                                    placeholder="Karte suchen..."
                                    value={search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
                                )}
                            </div>

                            {searchResults.length > 0 && (
                                <div className="max-h-96 overflow-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Karte</TableHead>
                                                <TableHead>Set</TableHead>
                                                <TableHead>Nummer</TableHead>
                                                <TableHead>Seltenheit</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {searchResults.map((result) => (
                                                <TableRow
                                                    key={result.id}
                                                    className={`cursor-pointer ${selectedCard?.id === result.id ? 'bg-primary/10' : ''}`}
                                                    onClick={() => handleSelectCard(result)}
                                                >
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {result.image_url && (
                                                                <img
                                                                    src={result.image_url}
                                                                    alt={result.card_name}
                                                                    className="h-8 w-auto rounded"
                                                                />
                                                            )}
                                                            {result.card_name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{result.set_name}</TableCell>
                                                    <TableCell>{result.collector_number}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {getRiftboundRarityLabel(result.rarity)}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Selected Card Preview */}
                    {selectedCard && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Ausgewählte Karte</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    {selectedCard.image_url && (
                                        <img
                                            src={selectedCard.image_url}
                                            alt={selectedCard.card_name}
                                            className="h-48 w-auto rounded-lg shadow"
                                        />
                                    )}
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-xl font-bold">{selectedCard.card_name}</h3>
                                        <p className="text-muted-foreground">
                                            {selectedCard.set_name} - {selectedCard.collector_number}
                                        </p>
                                        <div className="flex gap-2">
                                            <Badge>{getRiftboundRarityLabel(selectedCard.rarity)}</Badge>
                                            <Badge variant="outline">
                                                {getRiftboundFoilingLabel(selectedCard.foiling)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Confirmation Panel */}
                <div className="w-full space-y-4 lg:w-80">
                    {/* Lot Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Lot</CardTitle>
                            <CardDescription>
                                {selectedLot
                                    ? `Lot ${selectedLot.lot_number}${selectedLot.box ? ` (${selectedLot.box.name})` : ''}`
                                    : 'Kein Lot ausgewählt'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Select
                                value={selectedLotId?.toString() ?? ''}
                                onValueChange={(v) => setSelectedLotId(parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Lot auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                    {lots.map((lot) => (
                                        <SelectItem key={lot.id} value={lot.id.toString()}>
                                            Lot {lot.lot_number}
                                            {lot.box && ` (${lot.box.name})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setShowNewLotDialog(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Neues Lot
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Card Options */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Kartenoptionen</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Zustand</Label>
                                <Select
                                    value={condition}
                                    onValueChange={(v) => setCondition(v as RiftboundConditionKey)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(RIFTBOUND_CONDITIONS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {key} - {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Preis (optional)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                            </div>

                            <Button
                                className="w-full"
                                disabled={!selectedCard || !selectedLotId || isConfirming}
                                onClick={handleConfirm}
                            >
                                {isConfirming ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Karte hinzufügen
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Recent Scans */}
                    {recentScans.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Zuletzt hinzugefügt</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {recentScans.map((scan, index) => (
                                        <li
                                            key={`${scan.id}-${index}`}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <span>{scan.card_name}</span>
                                            <Badge variant="outline">#{scan.position}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* New Lot Dialog */}
            <Dialog open={showNewLotDialog} onOpenChange={setShowNewLotDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Neues Lot erstellen</DialogTitle>
                        <DialogDescription>
                            Erstelle ein neues Lot für deine Karten.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Box (optional)</Label>
                            <Select
                                value={newLotBoxId?.toString() ?? 'none'}
                                onValueChange={(v) => setNewLotBoxId(v === 'none' ? null : parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Box auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Keine Box</SelectItem>
                                    {boxes.map((box) => (
                                        <SelectItem key={box.id} value={box.id.toString()}>
                                            {box.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Notizen (optional)</Label>
                            <Input
                                placeholder="z.B. Booster Box Opening"
                                value={newLotNotes}
                                onChange={(e) => setNewLotNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewLotDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleCreateLot}>Erstellen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
