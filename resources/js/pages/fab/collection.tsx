import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { index as playsetRulesIndex } from '@/routes/playset-rules';
import { type BreadcrumbItem } from '@/types';
import {
    type FabCollection,
    type FabCollectionFilters,
    type PaginatedData,
    getConditionLabel,
    getLanguageLabel,
    getRarityLabel,
    getFoilingLabel,
    getPitchColor,
} from '@/types/fab';
import { Head, Link, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { Check, Plus, Settings, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface GameFormat {
    id: number;
    slug: string;
    name: string;
}

interface PlaysetInfo {
    card_name: string;
    owned: number;
    max: number;
    complete: boolean;
}

interface Props {
    collection: PaginatedData<FabCollection>;
    filters: FabCollectionFilters & { format?: string; playset?: string };
    conditions: Record<string, string>;
    rarities: Record<string, string>;
    foilings: Record<string, string>;
    stats: {
        unique_cards: number;
        total_cards: number;
    };
    formats: GameFormat[];
    playsetData: Record<string, PlaysetInfo>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Flesh and Blood',
        href: '/fab/cards',
    },
    {
        title: 'Sammlung',
        href: '/fab/collection',
    },
];

export default function FabCollectionIndex({ collection, filters, conditions, rarities, foilings, stats, formats, playsetData }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Helper to get playset info for a card
    const getPlaysetInfo = (cardName: string): PlaysetInfo | null => {
        return playsetData[cardName] ?? null;
    };

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/fab/collection',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof FabCollectionFilters, value: string | undefined) => {
        router.get(
            '/fab/collection',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (item: FabCollection) => {
        if (item.printing) {
            router.visit(`/fab/printings/${item.printing.id}`);
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
        if (!confirm(`${selectedIds.length} Karte(n) wirklich aus der Sammlung löschen?`)) return;

        router.post('/fab/collection/delete-multiple', { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const columns: ColumnDef<FabCollection>[] = useMemo(
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
                    const pitch = row.original.printing?.card?.pitch ?? null;
                    const pitchColor = getPitchColor(pitch);
                    return (
                        <div className="flex items-center gap-3">
                            <CardImage
                                src={row.original.printing?.image_url}
                                alt={row.original.printing?.card?.name ?? ''}
                                className="h-12 w-auto rounded"
                                placeholderClassName="h-12 w-9 rounded"
                            />
                            <div>
                                <div className="flex items-center gap-2 font-medium">
                                    {row.original.printing?.card?.name}
                                    <span
                                        className={`inline-block h-3 w-3 rounded-full ${
                                            pitchColor === 'red'
                                                ? 'bg-red-500'
                                                : pitchColor === 'yellow'
                                                  ? 'bg-yellow-500'
                                                  : pitchColor === 'blue'
                                                    ? 'bg-blue-500'
                                                    : 'bg-gray-400'
                                        }`}
                                        title={pitchColor ? `Pitch ${pitch}` : 'Kein Pitch'}
                                    />
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    {row.original.printing?.collector_number}
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
            ...(filters.format ? [{
                id: 'playset',
                header: 'Playset',
                cell: ({ row }: { row: { original: FabCollection } }) => {
                    const cardName = row.original.printing?.card?.name;
                    if (!cardName) return '-';
                    const playset = getPlaysetInfo(cardName);
                    if (!playset) return '-';

                    const isComplete = playset.complete;
                    return (
                        <div className="flex items-center gap-1">
                            <Badge
                                variant={isComplete ? 'default' : 'outline'}
                                className={isComplete ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                                {playset.owned}/{playset.max}
                                {isComplete && <Check className="ml-1 h-3 w-3" />}
                            </Badge>
                        </div>
                    );
                },
            }] : []),
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
                accessorKey: 'foiling',
                header: 'Foiling',
                cell: ({ row }) => getFoilingLabel(row.original.printing?.foiling ?? null),
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
            <Head title="FaB Sammlung" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Flesh and Blood - Sammlung</h1>
                        <p className="text-muted-foreground">
                            {stats.unique_cards} verschiedene Karten, {stats.total_cards} insgesamt
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={playsetRulesIndex().url}>
                                <Settings className="mr-2 h-4 w-4" />
                                Playset-Regeln
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/fab/inventory">
                                <Plus className="mr-2 h-4 w-4" />
                                Vom Inventar hinzufügen
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
                                <SelectItem value="all">Alle Zustände</SelectItem>
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

                {/* Playset Filter Section */}
                <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Playset-Ansicht:</span>
                        <Select
                            value={filters.format ?? 'none'}
                            onValueChange={(value) =>
                                handleFilterChange('format', value === 'none' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Format wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Kein Format</SelectItem>
                                {formats.map((format) => (
                                    <SelectItem key={format.id} value={String(format.id)}>
                                        {format.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {filters.format && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Zeige:</span>
                            <Select
                                value={filters.playset ?? 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('playset', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Playsets</SelectItem>
                                    <SelectItem value="incomplete">Unvollständig</SelectItem>
                                    <SelectItem value="complete">Vollständig</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {!filters.format && (
                        <p className="text-sm text-muted-foreground">
                            Wähle ein Format um Playset-Status zu sehen
                        </p>
                    )}
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
                        <span className="text-sm">{selectedIds.length} ausgewählt</span>
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
