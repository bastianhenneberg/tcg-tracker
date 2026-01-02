import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type RiftboundCard,
    type RiftboundCardFilters,
    type PaginatedData,
    getDomainColor,
} from '@/types/riftbound';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    cards: PaginatedData<RiftboundCard>;
    filters: RiftboundCardFilters;
    types: Record<string, string>;
    domains: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Riftbound',
        href: '/riftbound/cards',
    },
    {
        title: 'Kartendatenbank',
        href: '/riftbound/cards',
    },
];

export default function RiftboundCardsIndex({ cards, filters, types, domains }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/riftbound/cards',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof RiftboundCardFilters, value: string | undefined) => {
        router.get(
            '/riftbound/cards',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (card: RiftboundCard) => {
        router.visit(`/riftbound/cards/${card.id}`);
    };

    const columns: ColumnDef<RiftboundCard>[] = useMemo(
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
                                <div className="font-medium">{row.original.name}</div>
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
                cell: ({ row }) => row.original.types?.join(', ') ?? '-',
            },
            {
                id: 'domains',
                header: 'Domains',
                cell: ({ row }) => {
                    const cardDomains = row.original.domains ?? [];
                    return (
                        <div className="flex gap-1">
                            {cardDomains.map((domain) => (
                                <span key={domain} className={`font-medium ${getDomainColor(domain)}`}>
                                    {domain}
                                </span>
                            ))}
                        </div>
                    );
                },
            },
            {
                id: 'stats',
                header: 'Stats',
                cell: ({ row }) => {
                    const parts = [];
                    if (row.original.energy !== null) parts.push(`Energy: ${row.original.energy}`);
                    if (row.original.power !== null) parts.push(`Power: ${row.original.power}`);
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
            <Head title="Riftbound Kartendatenbank" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Riftbound - Kartendatenbank</h1>
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
                            value={filters.type ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('type', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[140px]">
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

                        <Select
                            value={filters.domain ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('domain', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Alle Domains" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Domains</SelectItem>
                                {Object.entries(domains).map(([key, label]) => (
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
