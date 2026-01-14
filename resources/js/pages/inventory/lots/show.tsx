import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, DataTableToolbar, type ColumnDef, type PaginatedData } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { show as boxShow } from '@/routes/boxes';
import { destroy as lotDestroy, index as lotsIndex, show as lotShow, update as lotUpdate } from '@/routes/lots';
import { type BreadcrumbItem } from '@/types';
import { type Box, type Lot } from '@/types/inventory';
import { type UnifiedInventory, getConditionLabel } from '@/types/unified';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronDown, Download, Edit, Heart, Layers, Package, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    lot: Lot;
    items: PaginatedData<UnifiedInventory>;
    boxes: Box[];
    filters: Record<string, string | undefined>;
    conditions: Record<string, string>;
    foilings: Record<string, string>;
    rarities: Record<string, string>;
    stats: {
        total: number;
    };
}

export default function LotShow({
    lot,
    items,
    boxes,
    filters,
    conditions,
    foilings,
    rarities,
    stats,
}: Props) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editForm, setEditForm] = useState({
        box_id: lot.box_id?.toString() ?? '',
        card_range_start: lot.card_range_start?.toString() ?? '',
        card_range_end: lot.card_range_end?.toString() ?? '',
        notes: lot.notes ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedItems, setSelectedItems] = useState<UnifiedInventory[]>([]);

    // Define columns for DataTable
    const columns = useMemo<ColumnDef<UnifiedInventory, unknown>[]>(
        () => [
            {
                id: 'position',
                accessorFn: (row) => (row.extra as Record<string, number>)?.position_in_lot ?? '-',
                header: '#',
                cell: ({ row }) => (
                    <span className="text-muted-foreground font-mono">
                        {(row.original.extra as Record<string, number>)?.position_in_lot ?? items.from! + row.index}
                    </span>
                ),
            },
            {
                id: 'name',
                accessorFn: (row) => row.printing?.card?.name ?? '',
                header: 'Karte',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            {item.printing?.image_url && (
                                <img
                                    src={item.printing.image_url}
                                    alt={item.printing?.card?.name ?? ''}
                                    className="h-12 w-auto rounded"
                                />
                            )}
                            <div>
                                <div className="font-medium">{item.printing?.card?.name ?? 'Unbekannt'}</div>
                                <div className="text-muted-foreground text-sm">{item.printing?.collector_number}</div>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'set',
                accessorFn: (row) => row.printing?.set?.name ?? row.printing?.set_name ?? row.printing?.set_code ?? '',
                header: 'Set',
                cell: ({ row }) => (
                    <span className="text-muted-foreground">
                        {row.original.printing?.set?.name ?? row.original.printing?.set_name ?? row.original.printing?.set_code}
                    </span>
                ),
            },
            {
                id: 'rarity',
                accessorFn: (row) => row.printing?.rarity ?? '',
                header: 'Seltenheit',
                cell: ({ row }) => row.original.printing?.rarity_label ?? row.original.printing?.rarity ?? '-',
            },
            {
                id: 'foiling',
                accessorFn: (row) => row.printing?.finish ?? '',
                header: 'Foiling',
                cell: ({ row }) => row.original.printing?.finish_label ?? row.original.printing?.finish ?? '-',
            },
            {
                id: 'condition',
                accessorKey: 'condition',
                header: 'Zustand',
                cell: ({ row }) => <Badge variant="outline">{getConditionLabel(row.original.condition)}</Badge>,
            },
        ],
        [items.from]
    );

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

    const currentUrl = lotShow(lot).url;

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            currentUrl,
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: string, value: string | undefined) => {
        router.get(
            currentUrl,
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const clearFilters = () => {
        setSearch('');
        router.get(currentUrl, {}, { preserveState: true, preserveScroll: true });
    };

    const hasActiveFilters = filters.search || filters.condition || filters.foiling || filters.rarity;

    const currentSort = {
        field: filters.sort ?? 'created_at',
        direction: (filters.direction ?? 'desc') as 'asc' | 'desc',
    };

    const handleSortChange = (sort: { field: string; direction: 'asc' | 'desc' }) => {
        router.get(
            currentUrl,
            { ...filters, sort: sort.field, direction: sort.direction, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSave = () => {
        setSaving(true);
        router.patch(
            lotUpdate(lot).url,
            {
                box_id: parseInt(editForm.box_id),
                card_range_start: editForm.card_range_start ? parseInt(editForm.card_range_start) : null,
                card_range_end: editForm.card_range_end ? parseInt(editForm.card_range_end) : null,
                notes: editForm.notes || null,
            },
            {
                onSuccess: () => {
                    setShowEditDialog(false);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            }
        );
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

    const selectedIds = selectedItems.map((item) => item.id);

    const handleDeleteMultiple = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`${selectedIds.length} Karte(n) wirklich löschen?`)) return;
        router.post(
            '/g/fab/inventory/delete-multiple',
            { ids: selectedIds },
            { onSuccess: () => setSelectedItems([]) }
        );
    };

    const handleMoveToCollection = () => {
        if (selectedIds.length === 0) return;
        router.post(
            '/g/fab/inventory/move-to-collection',
            { ids: selectedIds },
            { onSuccess: () => setSelectedItems([]) }
        );
    };

    const handleMarkSold = () => {
        if (selectedIds.length === 0) return;
        router.post(
            '/g/fab/inventory/mark-sold',
            { ids: selectedIds },
            { onSuccess: () => setSelectedItems([]) }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Lot #${lot.lot_number}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
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
                            <span>{stats.total} Karten</span>
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
                                    <Link href={`/scanner?game=fab&lot=${lot.id}`}>Flesh and Blood</Link>
                                </DropdownMenuItem>
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

                {/* Filters */}
                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                        <Input
                            placeholder="Karte suchen..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="max-w-sm pl-9"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={filters.condition ?? 'all'}
                            onValueChange={(value) => handleFilterChange('condition', value === 'all' ? undefined : value)}
                        >
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Alle Zustände" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Zustände</SelectItem>
                                {Object.entries(conditions).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {Object.keys(foilings).length > 1 && (
                            <Select
                                value={filters.foiling ?? 'all'}
                                onValueChange={(value) => handleFilterChange('foiling', value === 'all' ? undefined : value)}
                            >
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Alle Foilings" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Foilings</SelectItem>
                                    {Object.entries(foilings).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {Object.keys(rarities).length > 1 && (
                            <Select
                                value={filters.rarity ?? 'all'}
                                onValueChange={(value) => handleFilterChange('rarity', value === 'all' ? undefined : value)}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Alle Seltenheiten" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Seltenheiten</SelectItem>
                                    {Object.entries(rarities).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {hasActiveFilters && (
                            <Button variant="ghost" size="icon" onClick={clearFilters} title="Filter zurücksetzen">
                                <X className="h-4 w-4" />
                            </Button>
                        )}

                        <Button variant="outline" size="default" asChild>
                            <a href={`/g/fab/inventory/export?lot=${lot.id}`} download>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Bulk Actions */}
                <DataTableToolbar selectedCount={selectedItems.length}>
                    <Button variant="outline" size="sm" onClick={handleMoveToCollection}>
                        <Heart className="mr-2 h-4 w-4" />
                        Zur Sammlung
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleMarkSold}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Verkauft
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteMultiple}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Löschen
                    </Button>
                </DataTableToolbar>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={items}
                    enableRowSelection
                    onSelectionChange={setSelectedItems}
                    sort={currentSort}
                    onSortChange={handleSortChange}
                    getRowId={(row) => row.id.toString()}
                    emptyState={
                        <div className="flex flex-col items-center justify-center py-12">
                            <Layers className="text-muted-foreground mb-4 h-12 w-12" />
                            <h3 className="text-lg font-medium">
                                {hasActiveFilters ? 'Keine Ergebnisse' : 'Keine Karten'}
                            </h3>
                            <p className="text-muted-foreground mb-4 text-center">
                                {hasActiveFilters
                                    ? 'Keine Karten entsprechen den Filterkriterien.'
                                    : 'Dieses Lot enthält noch keine Karten.'}
                            </p>
                            {hasActiveFilters ? (
                                <Button variant="outline" onClick={clearFilters}>
                                    Filter zurücksetzen
                                </Button>
                            ) : (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button>
                                            Karten scannen
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/scanner?game=fab&lot=${lot.id}`}>Flesh and Blood</Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    }
                />
            </div>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Lot #{lot.lot_number} bearbeiten</DialogTitle>
                        <DialogDescription>Ändere den Karton oder die Notizen für dieses Lot.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Karton</Label>
                            <Select value={editForm.box_id} onValueChange={(v) => setEditForm({ ...editForm, box_id: v })}>
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
                            {stats.total > 0 && (
                                <span className="text-destructive mt-2 block font-medium">
                                    Achtung: {stats.total} Karten werden ebenfalls gelöscht!
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
