import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type RiftboundCollection,
    type RiftboundCollectionFilters,
    type PaginatedData,
    getRiftboundConditionLabel,
    getRiftboundRarityLabel,
    getRiftboundFoilingLabel,
} from '@/types/riftbound';
import { Head, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface GameFormat {
    id: number;
    name: string;
    code: string;
}

interface Props {
    collection: PaginatedData<RiftboundCollection>;
    filters: RiftboundCollectionFilters;
    conditions: Record<string, string>;
    rarities: Record<string, string>;
    foilings: Record<string, string>;
    stats: {
        unique_cards: number;
        total_cards: number;
    };
    formats: GameFormat[];
    playsetData: Record<string, { owned: number; needed: number; complete: boolean }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Riftbound',
        href: '/riftbound/cards',
    },
    {
        title: 'Sammlung',
        href: '/riftbound/collection',
    },
];

export default function RiftboundCollectionIndex({ collection, filters, conditions, rarities, foilings, stats, formats, playsetData }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/riftbound/collection',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof RiftboundCollectionFilters, value: string | undefined) => {
        router.get(
            '/riftbound/collection',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
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
        if (!confirm(`${selectedIds.length} Eintrag/Einträge wirklich löschen?`)) return;
        router.post('/riftbound/collection/delete-multiple', { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const getPlaysetInfo = (cardName: string) => {
        if (!playsetData || Object.keys(playsetData).length === 0) return null;
        return playsetData[cardName] ?? null;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Riftbound Sammlung" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Riftbound - Sammlung</h1>
                        <p className="text-muted-foreground">
                            {stats.unique_cards} verschiedene Karten, {stats.total_cards} insgesamt
                        </p>
                    </div>
                </div>

                {/* Filters */}
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
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Zustand" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Zustände</SelectItem>
                                {Object.entries(conditions).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {key} - {label}
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

                        {formats.length > 0 && (
                            <Select
                                value={filters.format ?? 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('format', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Formate</SelectItem>
                                    {formats.map((format) => (
                                        <SelectItem key={format.id} value={format.id.toString()}>
                                            {format.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {filters.format && (
                            <Select
                                value={filters.playset ?? 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('playset', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Playset" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle</SelectItem>
                                    <SelectItem value="incomplete">Unvollständig</SelectItem>
                                    <SelectItem value="complete">Vollständig</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                        <span className="text-sm font-medium">{selectedIds.length} ausgewählt</span>
                        <div className="flex-1" />
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                        </Button>
                    </div>
                )}

                {/* Collection Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={selectedIds.length === collection.data.length && collection.data.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                    />
                                </TableHead>
                                <TableHead>Karte</TableHead>
                                <TableHead>Set</TableHead>
                                <TableHead>Seltenheit</TableHead>
                                <TableHead>Zustand</TableHead>
                                <TableHead className="text-center">Anzahl</TableHead>
                                {filters.format && <TableHead>Playset</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {collection.data.map((item) => {
                                const playsetInfo = getPlaysetInfo(item.printing?.card?.name ?? '');
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {item.printing?.image_url && (
                                                    <img
                                                        src={item.printing.image_url}
                                                        alt={item.printing?.card?.name}
                                                        className="h-12 w-auto rounded"
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-medium">{item.printing?.card?.name}</div>
                                                    <div className="text-muted-foreground text-sm">
                                                        {item.printing?.collector_number}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{item.printing?.set?.name ?? item.printing?.set?.code}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {getRiftboundRarityLabel(item.printing?.rarity ?? null)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {item.condition} - {getRiftboundConditionLabel(item.condition)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                                        {filters.format && playsetInfo && (
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className={playsetInfo.complete ? 'text-green-600' : 'text-orange-500'}>
                                                        {playsetInfo.owned}/{playsetInfo.needed}
                                                    </span>
                                                    {playsetInfo.complete && (
                                                        <Badge variant="outline" className="border-green-500 text-green-600">
                                                            Vollständig
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                            {collection.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={filters.format ? 7 : 6} className="py-8 text-center text-muted-foreground">
                                        Keine Karten in der Sammlung
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {collection.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {collection.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
