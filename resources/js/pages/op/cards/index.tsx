import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type OpCard,
    type OpCardFilters,
    type PaginatedData,
    CARD_TYPES,
    COLORS,
    ATTRIBUTES,
    getColorClass,
} from '@/types/op';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    cards: PaginatedData<OpCard>;
    filters: OpCardFilters;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'One Piece',
        href: '/onepiece/cards',
    },
    {
        title: 'Kartendatenbank',
        href: '/onepiece/cards',
    },
];

export default function OpCardsIndex({ cards, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/onepiece/cards',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof OpCardFilters, value: string | undefined) => {
        router.get(
            '/onepiece/cards',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (card: OpCard) => {
        router.visit(`/onepiece/cards/${card.id}`);
    };

    const columns: ColumnDef<OpCard>[] = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => {
                    return (
                        <div className="flex items-center gap-3">
                            {row.original.printings?.[0]?.image_url && (
                                <img
                                    src={row.original.printings[0].image_url}
                                    alt={row.original.name}
                                    className="h-12 w-auto rounded"
                                />
                            )}
                            <div>
                                <div className="flex items-center gap-2 font-medium">
                                    {row.original.name}
                                    <span
                                        className={`inline-block h-3 w-3 rounded-full ${getColorClass(row.original.color)}`}
                                        title={row.original.color}
                                    />
                                    {row.original.color_secondary && (
                                        <span
                                            className={`inline-block h-3 w-3 rounded-full ${getColorClass(row.original.color_secondary)}`}
                                            title={row.original.color_secondary}
                                        />
                                    )}
                                </div>
                                {row.original.printings?.[0]?.collector_number && (
                                    <div className="text-muted-foreground text-sm">
                                        {row.original.printings[0].external_id}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'card_type',
                header: 'Typ',
                cell: ({ row }) => row.original.card_type ?? '-',
            },
            {
                id: 'stats',
                header: 'Stats',
                cell: ({ row }) => {
                    const parts = [];
                    if (row.original.cost !== null) parts.push(`Cost: ${row.original.cost}`);
                    if (row.original.power !== null) parts.push(`Power: ${row.original.power}`);
                    if (row.original.life !== null) parts.push(`Life: ${row.original.life}`);
                    if (row.original.counter !== null) parts.push(`Counter: ${row.original.counter}`);
                    return parts.length > 0 ? parts.join(' | ') : '-';
                },
            },
            {
                id: 'types',
                header: 'Typen',
                cell: ({ row }) => row.original.types?.join(', ') ?? '-',
            },
            {
                id: 'printings_count',
                header: 'Drucke',
                cell: ({ row }) => row.original.printings?.length ?? 0,
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="One Piece Kartendatenbank" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">One Piece - Kartendatenbank</h1>
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
                            value={filters.card_type ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('card_type', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Alle Typen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Typen</SelectItem>
                                {Object.entries(CARD_TYPES).map(([key, label]) => (
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
                                <SelectValue placeholder="Alle Farben" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Farben</SelectItem>
                                {Object.entries(COLORS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.attribute ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('attribute', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Alle Attribute" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Attribute</SelectItem>
                                {Object.entries(ATTRIBUTES).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DataTable columns={columns} data={cards} onRowClick={handleRowClick} />
            </div>
        </AppLayout>
    );
}
