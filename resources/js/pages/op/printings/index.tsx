import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type OpPrinting,
    type OpPrintingFilters,
    type OpSet,
    type PaginatedData,
    RARITIES,
    LANGUAGES,
    getRarityLabel,
    getLanguageLabel,
    getColorClass,
} from '@/types/op';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    printings: PaginatedData<OpPrinting>;
    filters: OpPrintingFilters;
    sets: OpSet[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'One Piece',
        href: '/onepiece/cards',
    },
    {
        title: 'Drucke',
        href: '/onepiece/printings',
    },
];

export default function OpPrintingsIndex({ printings, filters, sets }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/onepiece/printings',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof OpPrintingFilters, value: string | number | undefined) => {
        router.get(
            '/onepiece/printings',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (printing: OpPrinting) => {
        router.visit(`/onepiece/printings/${printing.id}`);
    };

    const columns: ColumnDef<OpPrinting>[] = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Karte',
                cell: ({ row }) => {
                    const card = row.original.card;
                    return (
                        <div className="flex items-center gap-3">
                            <CardImage
                                src={row.original.image_url}
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
                                        />
                                    )}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    {row.original.external_id}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'set',
                header: 'Set',
                cell: ({ row }) => row.original.set?.name ?? '-',
            },
            {
                accessorKey: 'collector_number',
                header: 'Nummer',
            },
            {
                accessorKey: 'rarity',
                header: 'Seltenheit',
                cell: ({ row }) => (
                    <Badge variant="outline">{getRarityLabel(row.original.rarity)}</Badge>
                ),
            },
            {
                accessorKey: 'language',
                header: 'Sprache',
                cell: ({ row }) => getLanguageLabel(row.original.language),
            },
            {
                accessorKey: 'is_alternate_art',
                header: 'Alt Art',
                cell: ({ row }) =>
                    row.original.is_alternate_art ? <Badge>Alt Art</Badge> : '-',
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="One Piece Drucke" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">One Piece - Drucke</h1>
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
                                {Object.entries(RARITIES).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.language ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('language', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Sprache" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle</SelectItem>
                                {Object.entries(LANGUAGES).map(([key, label]) => (
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
