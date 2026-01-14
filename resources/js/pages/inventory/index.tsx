import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, DataTableToolbar, type ColumnDef, type PaginatedData } from '@/components/ui/data-table';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type Game,
    type Lot,
    type UnifiedInventory,
} from '@/types/unified';
import { Head, Link, router } from '@inertiajs/react';
import { Download, Edit, Heart, Package, ShoppingCart, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    game: Game;
    inventory: PaginatedData<UnifiedInventory>;
    filters: Record<string, string | undefined>;
    conditions: Record<string, string>;
    languages: Record<string, string>;
    lots: Lot[];
    stats: {
        total: number;
        sold: number;
    };
}

export default function InventoryIndex({
    game,
    inventory,
    filters,
    conditions,
    languages,
    lots,
    stats,
}: Props) {
    const baseUrl = `/g/${game.slug}`;
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedItems, setSelectedItems] = useState<UnifiedInventory[]>([]);
    const [editingItem, setEditingItem] = useState<UnifiedInventory | null>(null);
    const selectedIds = selectedItems.map((item) => item.id);
    const [editForm, setEditForm] = useState({
        condition: '',
        language: '',
        printing_id: '',
        price: '',
        notes: '',
        lot_id: '',
    });
    const [saving, setSaving] = useState(false);

    // Reload data when the page becomes visible (tab switching)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                router.reload({ only: ['inventory', 'stats', 'lots'] });
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `${baseUrl}/cards` },
        { title: 'Inventar', href: `${baseUrl}/inventory` },
    ];

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            `${baseUrl}/inventory`,
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
            `${baseUrl}/inventory`,
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleMarkSold = () => {
        if (selectedIds.length === 0) return;
        router.post(
            `${baseUrl}/inventory/mark-sold`,
            { ids: selectedIds },
            { onSuccess: () => setSelectedItems([]) }
        );
    };

    const handleMoveToCollection = () => {
        if (selectedIds.length === 0) return;
        router.post(
            `${baseUrl}/inventory/move-to-collection`,
            { ids: selectedIds },
            { onSuccess: () => setSelectedItems([]) }
        );
    };

    const handleDeleteMultiple = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`${selectedIds.length} Karte(n) wirklich löschen?`)) return;
        router.post(
            `${baseUrl}/inventory/delete-multiple`,
            { ids: selectedIds },
            { onSuccess: () => setSelectedItems([]) }
        );
    };

    const openEditDialog = useCallback((item: UnifiedInventory) => {
        setEditingItem(item);
        setEditForm({
            condition: item.condition,
            language: item.language,
            printing_id: item.printing_id.toString(),
            price: item.purchase_price?.toString() ?? '',
            notes: item.notes ?? '',
            lot_id: item.lot_id?.toString() ?? '',
        });
    }, []);

    const handleSaveEdit = () => {
        if (!editingItem) return;
        setSaving(true);
        router.patch(
            `${baseUrl}/inventory/${editingItem.id}`,
            {
                condition: editForm.condition,
                language: editForm.language,
                printing_id: parseInt(editForm.printing_id),
                price: editForm.price ? parseFloat(editForm.price) : null,
                notes: editForm.notes || null,
                lot_id: editForm.lot_id ? parseInt(editForm.lot_id) : null,
            },
            {
                onSuccess: () => {
                    setEditingItem(null);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            }
        );
    };

    const handleDeleteSingle = () => {
        if (!editingItem) return;
        if (!confirm('Diese Karte wirklich löschen?')) return;
        router.delete(`${baseUrl}/inventory/${editingItem.id}`, {
            onSuccess: () => setEditingItem(null),
        });
    };

    // Define columns for DataTable
    const columns = useMemo<ColumnDef<UnifiedInventory, unknown>[]>(
        () => [
            {
                id: 'name',
                accessorFn: (row) => row.printing?.card?.name ?? '',
                header: 'Karte',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <Link
                            href={`${baseUrl}/cards/${item.printing?.card_id}`}
                            className="flex items-center gap-3 hover:opacity-80"
                        >
                            {item.printing?.image_url && (
                                <img
                                    src={item.printing.image_url}
                                    alt={item.printing.card?.name}
                                    className="h-12 w-auto rounded"
                                />
                            )}
                            <div>
                                <p className="font-medium hover:underline">{item.printing?.card?.name}</p>
                                <p className="text-muted-foreground text-sm">#{item.printing?.collector_number}</p>
                            </div>
                        </Link>
                    );
                },
            },
            {
                id: 'set',
                accessorFn: (row) => row.printing?.set_name ?? row.printing?.set_code ?? '',
                header: 'Set',
                cell: ({ row }) => (
                    <span className="text-sm">
                        {row.original.printing?.set_name ?? row.original.printing?.set_code}
                    </span>
                ),
            },
            {
                id: 'foiling',
                accessorFn: (row) => row.printing?.finish ?? '',
                header: 'Foiling',
                cell: ({ row }) => (
                    <span className="text-sm">
                        {row.original.printing?.finish_label ?? row.original.printing?.finish ?? '-'}
                    </span>
                ),
            },
            {
                id: 'condition',
                accessorKey: 'condition',
                header: 'Zustand',
                cell: ({ row }) => (
                    <Badge variant="outline">{conditions[row.original.condition] ?? row.original.condition}</Badge>
                ),
            },
            {
                id: 'lot',
                accessorFn: (row) => row.lot?.lot_number ?? '',
                header: 'Lot',
                cell: ({ row }) =>
                    row.original.lot ? (
                        <span className="text-muted-foreground text-sm">#{row.original.lot.lot_number}</span>
                    ) : null,
            },
            {
                id: 'price',
                accessorKey: 'purchase_price',
                header: () => <span className="block text-right">Preis</span>,
                cell: ({ row }) => (
                    <span className="block text-right">
                        {row.original.purchase_price ? `€${row.original.purchase_price.toFixed(2)}` : '-'}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: '',
                enableSorting: false,
                cell: ({ row }) => (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(row.original);
                        }}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                ),
            },
        ],
        [baseUrl, conditions, openEditDialog]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${game.name} - Inventar`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{game.name} - Inventar</h1>
                        <p className="text-muted-foreground text-sm">
                            {stats.total} Karten im Inventar, {stats.sold} verkauft
                        </p>
                    </div>
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

                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={filters.condition ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('condition', value === 'all' ? undefined : value)
                            }
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

                        {lots.length > 0 && (
                            <Select
                                value={filters.lot ?? 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('lot', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Alle Lots" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Lots</SelectItem>
                                    {lots.map((lot) => (
                                        <SelectItem key={lot.id} value={lot.id.toString()}>
                                            Lot #{lot.lot_number}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Button
                            variant="outline"
                            size="default"
                            asChild
                        >
                            <a
                                href={`${baseUrl}/inventory/export${filters.lot ? `?lot=${filters.lot}` : ''}${filters.condition ? `${filters.lot ? '&' : '?'}condition=${filters.condition}` : ''}`}
                                download
                            >
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
                    data={inventory}
                    enableRowSelection
                    onSelectionChange={setSelectedItems}
                    getRowId={(row) => row.id.toString()}
                    emptyState={
                        <div className="flex flex-col items-center justify-center py-8">
                            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-2 text-muted-foreground">Keine Karten im Inventar</p>
                        </div>
                    }
                />
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Karte bearbeiten</DialogTitle>
                        <DialogDescription>
                            {editingItem?.printing?.card?.name} - #{editingItem?.printing?.collector_number}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Zustand</Label>
                                <Select
                                    value={editForm.condition}
                                    onValueChange={(v) => setEditForm({ ...editForm, condition: v })}
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
                            <div className="space-y-2">
                                <Label>Sprache</Label>
                                <Select
                                    value={editForm.language}
                                    onValueChange={(v) => setEditForm({ ...editForm, language: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(languages).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {editingItem?.available_printings && editingItem.available_printings.length > 1 && (
                            <div className="space-y-2">
                                <Label>Foiling</Label>
                                <Select
                                    value={editForm.printing_id}
                                    onValueChange={(v) => setEditForm({ ...editForm, printing_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {editingItem.available_printings.map((p) => (
                                            <SelectItem key={p.id} value={p.id.toString()}>
                                                {p.finish_label || p.finish} ({p.collector_number})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Einkaufspreis (€)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lot</Label>
                                <Select
                                    value={editForm.lot_id || 'none'}
                                    onValueChange={(v) => setEditForm({ ...editForm, lot_id: v === 'none' ? '' : v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Kein Lot" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Kein Lot</SelectItem>
                                        {lots.map((lot) => (
                                            <SelectItem key={lot.id} value={lot.id.toString()}>
                                                Lot #{lot.lot_number}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                        <Button
                            variant="destructive"
                            onClick={handleDeleteSingle}
                            className="sm:mr-auto"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                        </Button>
                        <Button variant="outline" onClick={() => setEditingItem(null)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={saving}>
                            {saving ? 'Speichern...' : 'Speichern'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
