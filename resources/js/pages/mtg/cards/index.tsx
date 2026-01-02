import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type MtgCard,
    type MtgCardFilters,
    type PaginatedData,
    COLOR_LABELS,
} from '@/types/mtg';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    cards: PaginatedData<MtgCard>;
    filters: MtgCardFilters;
    colors: Record<string, string>;
    formats: Record<string, string>;
    types: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Magic: The Gathering',
        href: '/mtg/cards',
    },
    {
        title: 'Kartendatenbank',
        href: '/mtg/cards',
    },
];

export default function MtgCardsIndex({ cards, filters, colors, formats, types }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/mtg/cards',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof MtgCardFilters, value: string | undefined) => {
        router.get(
            '/mtg/cards',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (card: MtgCard) => {
        router.visit(`/mtg/cards/${card.id}`);
    };

    const columns: ColumnDef<MtgCard>[] = useMemo(
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
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    {row.original.mana_cost ?? ''}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'colors',
                header: 'Farben',
                cell: ({ row }) => {
                    const cardColors = row.original.colors;
                    if (!cardColors || cardColors.length === 0) {
                        return <span className="text-muted-foreground">Farblos</span>;
                    }
                    return (
                        <div className="flex gap-1">
                            {cardColors.map((color) => (
                                <span
                                    key={color}
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                                    style={{
                                        backgroundColor:
                                            color === 'W' ? '#F9FAF4' :
                                            color === 'U' ? '#0E68AB' :
                                            color === 'B' ? '#150B00' :
                                            color === 'R' ? '#D3202A' :
                                            color === 'G' ? '#00733E' : '#ccc',
                                        color: color === 'W' ? '#000' : '#fff',
                                        border: color === 'W' ? '1px solid #ccc' : 'none',
                                    }}
                                >
                                    {color}
                                </span>
                            ))}
                        </div>
                    );
                },
            },
            {
                id: 'type',
                header: 'Typ',
                cell: ({ row }) => row.original.type_line ?? '-',
            },
            {
                id: 'mana_value',
                header: 'MV',
                cell: ({ row }) => row.original.mana_value ?? '-',
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
            <Head title="MTG Kartendatenbank" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Magic: The Gathering - Kartendatenbank</h1>
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
                                {Object.entries(colors).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.type ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('type', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[160px]">
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
                            value={filters.format ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('format', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[160px]">
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

                        <Select
                            value={filters.mana_value ?? 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('mana_value', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Manakosten" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle MV</SelectItem>
                                <SelectItem value="0">0</SelectItem>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="6">6</SelectItem>
                                <SelectItem value="7+">7+</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DataTable columns={columns} data={cards} onRowClick={handleRowClick} />
            </div>
        </AppLayout>
    );
}
