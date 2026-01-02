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
    type OpCollection,
    type OpCollectionFilters,
    type PaginatedData,
    getConditionLabel,
    getLanguageLabel,
    getRarityLabel,
    getColorClass,
} from '@/types/op';
import { Head, Link, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    collection: PaginatedData<OpCollection>;
    filters: OpCollectionFilters;
    conditions: Record<string, string>;
    rarities: Record<string, string>;
    stats: {
        unique_cards: number;
        total_cards: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'One Piece',
        href: '/onepiece/cards',
    },
    {
        title: 'Sammlung',
        href: '/onepiece/collection',
    },
];

export default function OpCollectionIndex({ collection, filters, conditions, rarities, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/onepiece/collection',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof OpCollectionFilters, value: string | undefined) => {
        router.get(
            '/onepiece/collection',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (item: OpCollection) => {
        if (item.printing) {
            router.visit(`/onepiece/printings/${item.printing.id}`);
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
        if (!confirm(`${selectedIds.length} Karte(n) wirklich aus der Sammlung loeschen?`)) return;

        router.post('/onepiece/collection/delete-multiple', { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const columns: ColumnDef<OpCollection>[] = useMemo(
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
                    const card = row.original.printing?.card;
                    return (
                        <div className="flex items-center gap-3">
                            <CardImage
                                src={row.original.printing?.image_url}
                                alt={card?.name ?? ''}
                                className="h-12 w-auto rounded"
                                placeholderClassName="h-12 w-9 rounded"
                            />
                            <div>
                                <div className="flex items-center gap-2 font-medium">
                                    {card?.name}
                                    {card?.color && (
                                        <span
                                            className={`inline-block h-3 w-3 rounded-full ${getColorClass(card.color)}`}
                                            title={card.color}
                                        />
                                    )}
                                    {card?.color_secondary && (
                                        <span
                                            className={`inline-block h-3 w-3 rounded-full ${getColorClass(card.color_secondary)}`}
                                            title={card.color_secondary}
                                        />
                                    )}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    {row.original.printing?.external_id}
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
                accessorKey: 'notes',
                header: 'Notizen',
                cell: ({ row }) => row.original.notes ?? '-',
            },
        ],
        [selectedIds]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="One Piece Sammlung" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">One Piece - Sammlung</h1>
                        <p className="text-muted-foreground">
                            {stats.unique_cards} verschiedene Karten, {stats.total_cards} insgesamt
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild>
                            <Link href="/onepiece/inventory">
                                <Plus className="mr-2 h-4 w-4" />
                                Vom Inventar hinzufuegen
                            </Link>
                        </Button>
                    </div>
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
                                <SelectItem value="all">Alle Zustaende</SelectItem>
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
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
                        <span className="text-sm">{selectedIds.length} ausgewaehlt</span>
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
