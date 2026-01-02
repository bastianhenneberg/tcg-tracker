import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type MtgCollection,
    type MtgCollectionFilters,
    type PaginatedData,
    getConditionLabel,
    getLanguageLabel,
    getRarityLabel,
    getFinishLabel,
    getColorClass,
    COLOR_LABELS,
} from '@/types/mtg';
import { Head, Link, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    collection: PaginatedData<MtgCollection>;
    filters: MtgCollectionFilters;
    conditions: Record<string, string>;
    rarities: Record<string, string>;
    finishes: Record<string, string>;
    colors: Record<string, string>;
    stats: {
        total: number;
        unique: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Magic: The Gathering',
        href: '/mtg/cards',
    },
    {
        title: 'Sammlung',
        href: '/mtg/collection',
    },
];

export default function MtgCollectionIndex({ collection, filters, conditions, rarities, finishes, colors, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/mtg/collection',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof MtgCollectionFilters, value: string | undefined) => {
        router.get(
            '/mtg/collection',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (item: MtgCollection) => {
        if (item.printing) {
            router.visit(`/mtg/printings/${item.printing.id}`);
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

        router.post('/mtg/collection/delete-multiple', { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const columns: ColumnDef<MtgCollection>[] = useMemo(
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
                cell: ({ row }) => {
                    const colors = row.original.printing?.card?.colors ?? [];
                    return (
                        <div className="flex items-center gap-3">
                            <CardImage
                                src={row.original.printing?.image_url}
                                alt={row.original.printing?.card?.name ?? ''}
                                className="h-12 w-auto rounded"
                                placeholderClassName="h-12 w-9 rounded"
                            />
                            <div>
                                <div className="flex items-center gap-2 font-medium">
                                    {row.original.printing?.card?.name}
                                    {colors.length > 0 && (
                                        <div className="flex gap-0.5">
                                            {colors.map((c) => (
                                                <span
                                                    key={c}
                                                    className={`inline-block h-3 w-3 rounded-full ${getColorClass([c])}`}
                                                    title={COLOR_LABELS[c] ?? c}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    {row.original.printing?.set?.name} - {row.original.printing?.number}
                                </div>
                            </div>
                        </div>
                    );
                },
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
                accessorKey: 'finish',
                header: 'Finish',
                cell: ({ row }) => getFinishLabel(row.original.finish),
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
            <Head title="MTG Sammlung" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Magic: The Gathering - Sammlung</h1>
                        <p className="text-muted-foreground">
                            {stats.unique} verschiedene Karten, {stats.total} insgesamt
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/mtg/inventory">
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
                            value={filters.finish ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('finish', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Finish" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                {Object.entries(finishes).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.color ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('color', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Farbe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Farben</SelectItem>
                                {Object.entries(colors).map(([key, label]) => (
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
