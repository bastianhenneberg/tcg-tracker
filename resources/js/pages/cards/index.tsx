import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type CardFilters,
    type FilterOptions,
    type Game,
    type PaginatedData,
    type UnifiedCard,
    getPitchColor,
} from '@/types/unified';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    game: Game;
    cards: PaginatedData<UnifiedCard>;
    filters: CardFilters;
    filterOptions: FilterOptions;
    types: string[];
}

export default function CardsIndex({ game, cards, filters, filterOptions, types }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const baseUrl = `/g/${game.slug}/cards`;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: baseUrl },
        { title: 'Kartendatenbank', href: baseUrl },
    ];

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            baseUrl,
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: string, value: string | undefined) => {
        router.get(
            baseUrl,
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (card: UnifiedCard) => {
        router.visit(`${baseUrl}/${card.id}`);
    };

    const columns: ColumnDef<UnifiedCard>[] = useMemo(
        () => [
            {
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => {
                    const card = row.original;
                    const pitch = card.game_specific?.pitch as number | undefined;
                    const pitchColor = getPitchColor(pitch);

                    return (
                        <div className="flex items-center gap-3">
                            {card.printings?.[0]?.image_url && (
                                <img
                                    src={card.printings[0].image_url}
                                    alt={card.name}
                                    className="h-12 w-auto rounded"
                                />
                            )}
                            <div>
                                <div className="flex items-center gap-2 font-medium">
                                    {card.name}
                                    {pitch && (
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
                                    )}
                                    {card.colors.length > 0 && !pitch && (
                                        <span className="text-muted-foreground text-xs">
                                            {card.colors.join('/')}
                                        </span>
                                    )}
                                </div>
                                {card.printings?.[0]?.collector_number && (
                                    <div className="text-muted-foreground text-sm">
                                        {card.printings[0].set_code} {card.printings[0].collector_number}
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
                cell: ({ row }) => row.original.type_line ?? row.original.types?.join(', ') ?? '-',
            },
            {
                id: 'stats',
                header: 'Stats',
                cell: ({ row }) => {
                    const card = row.original;
                    const parts = [];
                    if (card.cost) parts.push(`Cost: ${card.cost}`);
                    if (card.power) parts.push(`Power: ${card.power}`);
                    if (card.defense) parts.push(`Def: ${card.defense}`);
                    if (card.health) parts.push(`HP: ${card.health}`);
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
            <Head title={`${game.name} - Kartendatenbank`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">{game.name} - Kartendatenbank</h1>
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
                        {/* Type filter */}
                        {types.length > 0 && (
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
                                    {types.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* FAB Pitch filter */}
                        {filterOptions.pitch && (
                            <Select
                                value={filters.pitch ?? 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('pitch', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Alle Pitch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Pitch</SelectItem>
                                    {Object.entries(filterOptions.pitch).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Color filter (MTG, OP) */}
                        {filterOptions.colors && (
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
                                    {Object.entries(filterOptions.colors).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Format filter */}
                        {filterOptions.formats && (
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
                                    {Object.entries(filterOptions.formats).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Riftbound Domains filter */}
                        {filterOptions.domains && (
                            <Select
                                value={filters.color ?? 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('color', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Alle Domains" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Domains</SelectItem>
                                    {Object.entries(filterOptions.domains).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <DataTable columns={columns} data={cards} onRowClick={handleRowClick} />
            </div>
        </AppLayout>
    );
}
