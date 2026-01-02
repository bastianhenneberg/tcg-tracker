import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type FabCard,
    type FabCardFilters,
    type PaginatedData,
    getPitchColor,
} from '@/types/fab';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    cards: PaginatedData<FabCard>;
    filters: FabCardFilters;
    formats: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Flesh and Blood',
        href: '/fab/cards',
    },
    {
        title: 'Kartendatenbank',
        href: '/fab/cards',
    },
];

export default function FabCardsIndex({ cards, filters, formats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/fab/cards',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof FabCardFilters, value: string | undefined) => {
        router.get(
            '/fab/cards',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (card: FabCard) => {
        router.visit(`/fab/cards/${card.id}`);
    };

    const columns: ColumnDef<FabCard>[] = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => {
                    const pitchColor = getPitchColor(row.original.pitch);
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
                                        className={`inline-block h-3 w-3 rounded-full ${
                                            pitchColor === 'red'
                                                ? 'bg-red-500'
                                                : pitchColor === 'yellow'
                                                  ? 'bg-yellow-500'
                                                  : pitchColor === 'blue'
                                                    ? 'bg-blue-500'
                                                    : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                    />
                                </div>
                                {row.original.printings?.[0]?.collector_number && (
                                    <div className="text-muted-foreground text-sm">
                                        {row.original.printings[0].collector_number}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'types',
                header: 'Typ',
                cell: ({ row }) => row.original.type_text ?? row.original.types?.join(', ') ?? '-',
            },
            {
                id: 'stats',
                header: 'Stats',
                cell: ({ row }) => {
                    const parts = [];
                    if (row.original.cost) parts.push(`Cost: ${row.original.cost}`);
                    if (row.original.power) parts.push(`Power: ${row.original.power}`);
                    if (row.original.defense) parts.push(`Defense: ${row.original.defense}`);
                    return parts.length > 0 ? parts.join(' | ') : '-';
                },
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
            <Head title="FaB Kartendatenbank" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Flesh and Blood - Kartendatenbank</h1>
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
                            value={filters.pitch?.toString() ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('pitch', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Alle Pitch" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Pitch</SelectItem>
                                <SelectItem value="1">Rot (1)</SelectItem>
                                <SelectItem value="2">Gelb (2)</SelectItem>
                                <SelectItem value="3">Blau (3)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.format ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('format', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Alle Formate" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Formate</SelectItem>
                                {Object.entries(formats).map(([key, label]) => (
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
