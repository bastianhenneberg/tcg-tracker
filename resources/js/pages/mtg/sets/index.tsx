import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type MtgSet,
    type MtgSetFilters,
    type PaginatedData,
} from '@/types/mtg';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    sets: PaginatedData<MtgSet>;
    filters: MtgSetFilters;
    types: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Magic: The Gathering',
        href: '/mtg/cards',
    },
    {
        title: 'Sets',
        href: '/mtg/sets',
    },
];

export default function MtgSetsIndex({ sets, filters, types }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/mtg/sets',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof MtgSetFilters, value: string | undefined) => {
        router.get(
            '/mtg/sets',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const columns: ColumnDef<MtgSet>[] = useMemo(
        () => [
            {
                accessorKey: 'code',
                header: 'Code',
                cell: ({ row }) => (
                    <span className="font-mono text-sm uppercase">{row.original.code}</span>
                ),
            },
            {
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => (
                    <span className="font-medium">{row.original.name}</span>
                ),
            },
            {
                accessorKey: 'type',
                header: 'Typ',
                cell: ({ row }) => row.original.type ?? '-',
            },
            {
                accessorKey: 'release_date',
                header: 'Release',
                cell: ({ row }) => row.original.release_date ?? '-',
            },
            {
                accessorKey: 'printings_count',
                header: 'Karten',
                cell: ({ row }) => row.original.printings_count ?? 0,
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="MTG Sets" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Magic: The Gathering - Sets</h1>
                </div>

                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <Input
                            placeholder="Set suchen..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={filters.type ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('type', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Alle Typen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Typen</SelectItem>
                                {Object.entries(types).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DataTable columns={columns} data={sets} />
            </div>
        </AppLayout>
    );
}
