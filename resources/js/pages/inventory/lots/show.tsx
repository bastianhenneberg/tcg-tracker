import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { index as lotsIndex, show as lotShow, update as lotUpdate, destroy as lotDestroy } from '@/routes/lots';
import { show as boxShow } from '@/routes/boxes';
import { type BreadcrumbItem } from '@/types';
import { getConditionLabel, getFoilingLabel, getLanguageLabel, getRarityLabel } from '@/types/fab';
import { printing as printingRoute } from '@/actions/App/Http/Controllers/Fab/FabCardController';
import { type Box, type Lot } from '@/types/inventory';
import { Head, Link, router } from '@inertiajs/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Edit, Layers, Package, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    lot: Lot;
    boxes: Box[];
}

export default function LotShow({ lot, boxes }: Props) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editForm, setEditForm] = useState({
        box_id: lot.box_id.toString(),
        card_range_start: lot.card_range_start?.toString() ?? '',
        card_range_end: lot.card_range_end?.toString() ?? '',
        notes: lot.notes ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Lots',
            href: lotsIndex().url,
        },
        {
            title: `Lot #${lot.lot_number}`,
            href: lotShow(lot).url,
        },
    ];

    const handleSave = () => {
        setSaving(true);
        router.patch(lotUpdate(lot).url, {
            box_id: parseInt(editForm.box_id),
            card_range_start: editForm.card_range_start ? parseInt(editForm.card_range_start) : null,
            card_range_end: editForm.card_range_end ? parseInt(editForm.card_range_end) : null,
            notes: editForm.notes || null,
        }, {
            onSuccess: () => {
                setShowEditDialog(false);
                setSaving(false);
            },
            onError: () => setSaving(false),
        });
    };

    const handleDelete = () => {
        setDeleting(true);
        router.delete(lotDestroy(lot).url, {
            onSuccess: () => {
                // Will redirect to index
            },
            onError: () => setDeleting(false),
        });
    };

    const fabItems = lot.fab_inventory_items ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Lot #${lot.lot_number}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Layers className="h-6 w-6" />
                            Lot #{lot.lot_number}
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {lot.box ? (
                                <Link href={boxShow(lot.box).url} className="hover:underline">
                                    {lot.box.name}
                                </Link>
                            ) : (
                                <span>Kein Karton</span>
                            )}
                            <span>•</span>
                            <span>{fabItems.length} Karten</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Bearbeiten
                        </Button>
                        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>
                                    Karten hinzufügen
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href="/fab/scanner">Flesh and Blood</Link>
                                </DropdownMenuItem>
                                {/* Weitere Spiele hier hinzufügen */}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {lot.notes && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Notizen</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{lot.notes}</p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Karten ({fabItems.length})</CardTitle>
                        <CardDescription>
                            Alle Karten in diesem Lot, sortiert nach Position
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {fabItems.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">#</TableHead>
                                        <TableHead>Karte</TableHead>
                                        <TableHead>Set</TableHead>
                                        <TableHead>Seltenheit</TableHead>
                                        <TableHead>Foiling</TableHead>
                                        <TableHead>Zustand</TableHead>
                                        <TableHead>Sprache</TableHead>
                                        <TableHead>Preis</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fabItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono text-muted-foreground">
                                                {item.position_in_lot}
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    href={printingRoute.url(item.fab_printing_id)}
                                                    className="flex items-center gap-3 hover:opacity-80"
                                                >
                                                    {item.printing?.image_url && (
                                                        <img
                                                            src={item.printing.image_url}
                                                            alt={item.printing?.card?.name ?? ''}
                                                            className="h-12 w-auto rounded"
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="font-medium hover:underline">
                                                            {item.printing?.card?.name ?? 'Unbekannt'}
                                                        </div>
                                                        <div className="text-muted-foreground text-sm">
                                                            {item.printing?.collector_number}
                                                        </div>
                                                    </div>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {item.printing?.set?.name ?? item.printing?.set?.external_id}
                                            </TableCell>
                                            <TableCell>
                                                {getRarityLabel(item.printing?.rarity ?? null)}
                                            </TableCell>
                                            <TableCell>
                                                {getFoilingLabel(item.printing?.foiling ?? null)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{getConditionLabel(item.condition)}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {getLanguageLabel(item.language)}
                                            </TableCell>
                                            <TableCell>
                                                {item.price ? `${item.price.toFixed(2)} €` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Layers className="text-muted-foreground mb-4 h-12 w-12" />
                                <h3 className="text-lg font-medium">Keine Karten</h3>
                                <p className="text-muted-foreground mb-4 text-center">
                                    Dieses Lot enthält noch keine Karten.
                                </p>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button>
                                            Karten scannen
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem asChild>
                                            <Link href="/fab/scanner">Flesh and Blood</Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Lot #{lot.lot_number} bearbeiten</DialogTitle>
                        <DialogDescription>
                            Ändere den Karton oder die Notizen für dieses Lot.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Karton</Label>
                            <Select
                                value={editForm.box_id}
                                onValueChange={(v) => setEditForm({ ...editForm, box_id: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {boxes.map((box) => (
                                        <SelectItem key={box.id} value={box.id.toString()}>
                                            {box.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Kartenbereich (optional)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    placeholder="Von"
                                    value={editForm.card_range_start}
                                    onChange={(e) => setEditForm({ ...editForm, card_range_start: e.target.value })}
                                    min={1}
                                />
                                <span className="text-muted-foreground">bis</span>
                                <Input
                                    type="number"
                                    placeholder="Bis"
                                    value={editForm.card_range_end}
                                    onChange={(e) => setEditForm({ ...editForm, card_range_end: e.target.value })}
                                    min={1}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notizen</Label>
                            <Textarea
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="Optionale Notizen..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Speichern...' : 'Speichern'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Lot löschen?</DialogTitle>
                        <DialogDescription>
                            Möchtest du Lot #{lot.lot_number} wirklich löschen?
                            {fabItems.length > 0 && (
                                <span className="block mt-2 text-destructive font-medium">
                                    Achtung: {fabItems.length} Karten werden ebenfalls gelöscht!
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Löschen...' : 'Löschen'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
