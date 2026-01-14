import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type Game,
    type Lot,
    type PaginatedData,
    type UnifiedInventory,
} from '@/types/unified';
import { Head, router } from '@inertiajs/react';
import { Heart, Package, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    game: Game;
    inventory: PaginatedData<UnifiedInventory>;
    filters: Record<string, string | undefined>;
    conditions: Record<string, string>;
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
    lots,
    stats,
}: Props) {
    const baseUrl = `/g/${game.slug}`;
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

    const toggleSelection = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === inventory.data.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(inventory.data.map((item) => item.id));
        }
    };

    const handleMarkSold = () => {
        if (selectedIds.length === 0) return;
        router.post(
            `${baseUrl}/inventory/mark-sold`,
            { ids: selectedIds },
            { onSuccess: () => setSelectedIds([]) }
        );
    };

    const handleMoveToCollection = () => {
        if (selectedIds.length === 0) return;
        router.post(
            `${baseUrl}/inventory/move-to-collection`,
            { ids: selectedIds },
            { onSuccess: () => setSelectedIds([]) }
        );
    };

    const handleDeleteMultiple = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`${selectedIds.length} Karte(n) wirklich löschen?`)) return;
        router.post(
            `${baseUrl}/inventory/delete-multiple`,
            { ids: selectedIds },
            { onSuccess: () => setSelectedIds([]) }
        );
    };

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
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                        <span className="text-sm font-medium">
                            {selectedIds.length} ausgewählt
                        </span>
                        <div className="flex-1" />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMoveToCollection}
                        >
                            <Heart className="mr-2 h-4 w-4" />
                            Zur Sammlung
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkSold}
                        >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Verkauft
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteMultiple}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                        </Button>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={
                                            inventory.data.length > 0 &&
                                            selectedIds.length === inventory.data.length
                                        }
                                        onCheckedChange={toggleAll}
                                    />
                                </TableHead>
                                <TableHead>Karte</TableHead>
                                <TableHead>Set</TableHead>
                                <TableHead>Zustand</TableHead>
                                <TableHead>Lot</TableHead>
                                <TableHead className="text-right">Preis</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventory.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                        <p className="mt-2 text-muted-foreground">
                                            Keine Karten im Inventar
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                inventory.data.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={() => toggleSelection(item.id)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {item.printing?.image_url && (
                                                    <img
                                                        src={item.printing.image_url}
                                                        alt={item.printing.card?.name}
                                                        className="h-12 w-auto rounded"
                                                    />
                                                )}
                                                <div>
                                                    <p className="font-medium">
                                                        {item.printing?.card?.name}
                                                    </p>
                                                    <p className="text-muted-foreground text-sm">
                                                        #{item.printing?.collector_number}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">
                                                {item.printing?.set_name ?? item.printing?.set_code}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {conditions[item.condition] ?? item.condition}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {item.lot && (
                                                <span className="text-sm text-muted-foreground">
                                                    #{item.lot.lot_number}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.price ? `€${item.price.toFixed(2)}` : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {inventory.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        {inventory.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
