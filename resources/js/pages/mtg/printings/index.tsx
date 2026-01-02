import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type MtgPrinting,
    type MtgPrintingFilters,
    type MtgSet,
    type PaginatedData,
    getRarityLabel,
} from '@/types/mtg';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    printings: PaginatedData<MtgPrinting>;
    sets: MtgSet[];
    filters: MtgPrintingFilters;
    rarities: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Magic: The Gathering',
        href: '/mtg/cards',
    },
    {
        title: 'Printings',
        href: '/mtg/printings',
    },
];

export default function MtgPrintingsIndex({ printings, sets, filters, rarities }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/mtg/printings',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof MtgPrintingFilters, value: string | number | undefined) => {
        router.get(
            '/mtg/printings',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (printing: MtgPrinting) => {
        router.visit(`/mtg/printings/${printing.id}`);
    };

    const columns: ColumnDef<MtgPrinting>[] = useMemo(
        () => [
            {
                accessorKey: 'card.name',
                header: 'Karte',
                cell: ({ row }) => {
                    return (
                        <div className="flex items-center gap-3">
                            {row.original.image_url && (
                                <img
                                    src={row.original.image_url}
                                    alt={row.original.card?.name ?? ''}
                                    className="h-12 w-auto rounded"
                                />
                            )}
                            <div>
                                <div className="font-medium">
                                    {row.original.card?.name ?? '-'}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    {row.original.number}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'set.name',
                header: 'Set',
                cell: ({ row }) => row.original.set?.name ?? row.original.set?.code ?? '-',
            },
            {
                accessorKey: 'rarity',
                header: 'Seltenheit',
                cell: ({ row }) => getRarityLabel(row.original.rarity),
            },
            {
                accessorKey: 'artist',
                header: 'Artist',
                cell: ({ row }) => row.original.artist ?? '-',
            },
            {
                id: 'finishes',
                header: 'Finishes',
                cell: ({ row }) => {
                    const parts = [];
                    if (row.original.has_non_foil) parts.push('Non-Foil');
                    if (row.original.has_foil) parts.push('Foil');
                    return parts.join(', ') || '-';
                },
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="MTG Printings" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Magic: The Gathering - Printings</h1>
                </div>

                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <Input
                            placeholder="Printing suchen..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={filters.set?.toString() ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('set', value === 'all' ? undefined : parseInt(value))
                            }
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Alle Sets" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Sets</SelectItem>
                                {sets.map((set) => (
                                    <SelectItem key={set.id} value={set.id.toString()}>
                                        {set.code} - {set.name}
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
                            <SelectTrigger className="w-[150px]">
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
                    </div>
                </div>

                <DataTable columns={columns} data={printings} onRowClick={handleRowClick} />
            </div>
        </AppLayout>
    );
}
