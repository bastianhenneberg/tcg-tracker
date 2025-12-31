import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type FabCollection,
    type FabCollectionFilters,
    type PaginatedData,
    getConditionLabel,
    getLanguageLabel,
    getRarityLabel,
    getFoilingLabel,
} from '@/types/fab';
import { Head, Link, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    collection: PaginatedData<FabCollection>;
    filters: FabCollectionFilters;
    conditions: Record<string, string>;
    rarities: Record<string, string>;
    foilings: Record<string, string>;
    stats: {
        unique_cards: number;
        total_cards: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Flesh and Blood',
        href: '/fab/cards',
    },
    {
        title: 'Sammlung',
        href: '/fab/collection',
    },
];

export default function FabCollectionIndex({ collection, filters, conditions, rarities, foilings, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/fab/collection',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof FabCollectionFilters, value: string | undefined) => {
        router.get(
            '/fab/collection',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (item: FabCollection) => {
        if (item.printing) {
            router.visit(`/fab/printings/${item.printing.id}`);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(collection.data.map((item) => item.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectItem = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter((i) => i !== id));
        }
    };

    const handleDelete = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`${selectedIds.length} Karte(n) wirklich aus der Sammlung löschen?`)) return;

        selectedIds.forEach((id) => {
            router.delete(`/fab/collection/${id}`, {
                preserveScroll: true,
            });
        });
        setSelectedIds([]);
    };

    const columns: ColumnDef<FabCollection>[] = useMemo(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={selectedIds.includes(row.original.id)}
                        onCheckedChange={(checked) => handleSelectItem(row.original.id, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                    />
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'name',
                header: 'Karte',
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        {row.original.printing?.image_url && (
                            <img
                                src={row.original.printing.image_url}
                                alt={row.original.printing?.card?.name ?? ''}
                                className="h-12 w-auto rounded"
                            />
                        )}
                        <div>
                            <div className="font-medium">{row.original.printing?.card?.name}</div>
                            <div className="text-muted-foreground text-sm">
                                {row.original.printing?.collector_number}
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'quantity',
                header: 'Anzahl',
                cell: ({ row }) => (
                    <Badge variant="secondary">{row.original.quantity}x</Badge>
                ),
            },
            {
                accessorKey: 'condition',
                header: 'Zustand',
                cell: ({ row }) => (
                    <Badge variant="outline">{getConditionLabel(row.original.condition)}</Badge>
                ),
            },
            {
                accessorKey: 'language',
                header: 'Sprache',
                cell: ({ row }) => getLanguageLabel(row.original.language),
            },
            {
                accessorKey: 'rarity',
                header: 'Seltenheit',
                cell: ({ row }) => getRarityLabel(row.original.printing?.rarity ?? null),
            },
            {
                accessorKey: 'foiling',
                header: 'Foiling',
                cell: ({ row }) => getFoilingLabel(row.original.printing?.foiling ?? null),
            },
            {
                accessorKey: 'notes',
                header: 'Notizen',
                cell: ({ row }) => row.original.notes ?? '-',
            },
        ],
        [selectedIds]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="FaB Sammlung" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Flesh and Blood - Sammlung</h1>
                        <p className="text-muted-foreground">
                            {stats.unique_cards} verschiedene Karten, {stats.total_cards} insgesamt
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/fab/inventory">
                            <Plus className="mr-2 h-4 w-4" />
                            Vom Inventar hinzufügen
                        </Link>
                    </Button>
                </div>

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
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Zustand" />
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

                        <Select
                            value={filters.rarity ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('rarity', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Seltenheit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                {Object.entries(rarities).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.foiling ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('foiling', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Foiling" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                {Object.entries(foilings).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
                        <span className="text-sm">{selectedIds.length} ausgewählt</span>
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Aus Sammlung entfernen
                        </Button>
                    </div>
                )}

                <DataTable columns={columns} data={collection} onRowClick={handleRowClick} />
            </div>
        </AppLayout>
    );
}
