import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type FabPrinting,
    type FabPrintingFilters,
    type FabSet,
    type PaginatedData,
    getRarityLabel,
    getFoilingLabel,
    getEditionLabel,
    getLanguageLabel,
} from '@/types/fab';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    printings: PaginatedData<FabPrinting>;
    sets: FabSet[];
    filters: FabPrintingFilters;
    rarities: Record<string, string>;
    foilings: Record<string, string>;
    editions: Record<string, string>;
    languages: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Flesh and Blood',
        href: '/fab/cards',
    },
    {
        title: 'Drucke',
        href: '/fab/printings',
    },
];

export default function FabPrintingsIndex({ printings, sets, filters, rarities, foilings, editions, languages }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/fab/printings',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof FabPrintingFilters, value: string | undefined) => {
        router.get(
            '/fab/printings',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (printing: FabPrinting) => {
        router.visit(`/fab/printings/${printing.id}`);
    };

    const columns: ColumnDef<FabPrinting>[] = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Karte',
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        {row.original.image_url && (
                            <img
                                src={row.original.image_url}
                                alt={row.original.card?.name ?? ''}
                                className="h-12 w-auto rounded"
                            />
                        )}
                        <div>
                            <div className="font-medium">{row.original.card?.name}</div>
                            <div className="text-muted-foreground text-sm">
                                {row.original.collector_number}
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'set',
                header: 'Set',
                cell: ({ row }) => row.original.set?.name ?? row.original.set?.external_id ?? '-',
            },
            {
                accessorKey: 'rarity',
                header: 'Seltenheit',
                cell: ({ row }) => getRarityLabel(row.original.rarity),
            },
            {
                accessorKey: 'foiling',
                header: 'Foiling',
                cell: ({ row }) => getFoilingLabel(row.original.foiling),
            },
            {
                accessorKey: 'edition',
                header: 'Edition',
                cell: ({ row }) => getEditionLabel(row.original.edition),
            },
            {
                accessorKey: 'language',
                header: 'Sprache',
                cell: ({ row }) => getLanguageLabel(row.original.language),
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="FaB Drucke" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Flesh and Blood - Drucke</h1>
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
                            value={filters.set?.toString() ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('set', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Alle Sets" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Sets</SelectItem>
                                {sets.map((set) => (
                                    <SelectItem key={set.id} value={set.id.toString()}>
                                        {set.name}
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

                <DataTable columns={columns} data={printings} onRowClick={handleRowClick} />
            </div>
        </AppLayout>
    );
}
