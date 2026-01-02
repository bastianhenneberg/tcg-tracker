import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type RiftboundInventory,
    type RiftboundInventoryFilters,
    type PaginatedData,
    getRiftboundConditionLabel,
    getRiftboundRarityLabel,
    getRiftboundFoilingLabel,
} from '@/types/riftbound';
import { Head, router } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Heart, Package, ShoppingCart, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface NormalizedInventoryItem {
    id: number;
    printing_id: number;
    card_id: number;
    card_name: string;
    set_name: string;
    collector_number: string;
    rarity: string | null;
    rarity_label: string | null;
    foiling: string | null;
    foiling_label: string | null;
    image_url: string | null;
    condition: string;
    condition_label: string;
    language: string;
    price: number | null;
    lot_id: number | null;
    lot_number: string | null;
    box_name: string | null;
    position_in_lot: number | null;
    created_at: string;
    printing?: {
        card?: {
            name: string;
        };
        set?: {
            name: string;
            code: string;
        };
        collector_number: string;
        rarity: string | null;
        rarity_label: string | null;
        foiling: string | null;
        foiling_label: string | null;
        image_url: string | null;
    };
    lot?: {
        lot_number: string;
        box?: {
            name: string;
        };
    };
}

interface GroupedInventory {
    key: string;
    cardName: string;
    setName: string;
    collectorNumber: string;
    rarity: string | null;
    rarityLabel: string | null;
    foiling: string | null;
    foilingLabel: string | null;
    imageUrl: string | null;
    printingId: number;
    cardId: number;
    items: NormalizedInventoryItem[];
    totalValue: number;
}

interface Props {
    inventory: PaginatedData<RiftboundInventory>;
    filters: RiftboundInventoryFilters;
    conditions: Record<string, string>;
    rarities: Record<string, string>;
    foilings: Record<string, string>;
    stats: {
        total: number;
        sold: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Riftbound',
        href: '/riftbound/cards',
    },
    {
        title: 'Inventar',
        href: '/riftbound/inventory',
    },
];

export default function RiftboundInventoryIndex({ inventory, filters, conditions, rarities, foilings, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Normalize and group inventory items
    const normalizedItems: NormalizedInventoryItem[] = useMemo(() => {
        return inventory.data.map((item) => ({
            id: item.id,
            printing_id: item.riftbound_printing_id,
            card_id: item.printing?.card?.id ?? 0,
            card_name: item.printing?.card?.name ?? 'Unknown',
            set_name: item.printing?.set?.name ?? item.printing?.set?.code ?? 'Unknown',
            collector_number: item.printing?.collector_number ?? '',
            rarity: item.printing?.rarity ?? null,
            rarity_label: item.printing?.rarity_label ?? null,
            foiling: item.printing?.foiling ?? null,
            foiling_label: item.printing?.foiling_label ?? null,
            image_url: item.printing?.image_url ?? null,
            condition: item.condition,
            condition_label: item.condition_label ?? getRiftboundConditionLabel(item.condition),
            language: item.language ?? 'EN',
            price: item.price,
            lot_id: item.lot_id,
            lot_number: item.lot?.lot_number ?? null,
            box_name: item.lot?.box?.name ?? null,
            position_in_lot: item.position_in_lot,
            created_at: item.created_at ?? new Date().toISOString(),
            printing: item.printing,
            lot: item.lot,
        }));
    }, [inventory.data]);

    const groupedInventory = useMemo(() => {
        const groups = new Map<string, GroupedInventory>();

        normalizedItems.forEach((item) => {
            const key = `${item.card_name}-${item.set_name}-${item.collector_number}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    cardName: item.card_name,
                    setName: item.set_name,
                    collectorNumber: item.collector_number,
                    rarity: item.rarity,
                    rarityLabel: item.rarity_label,
                    foiling: item.foiling,
                    foilingLabel: item.foiling_label,
                    imageUrl: item.image_url,
                    printingId: item.printing_id,
                    cardId: item.card_id,
                    items: [],
                    totalValue: 0,
                });
            }

            const group = groups.get(key)!;
            group.items.push(item);
            group.totalValue += item.price ?? 0;
        });

        return Array.from(groups.values()).sort((a, b) => a.cardName.localeCompare(b.cardName));
    }, [normalizedItems]);

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/riftbound/inventory',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof RiftboundInventoryFilters, value: string | undefined) => {
        router.get(
            '/riftbound/inventory',
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(normalizedItems.map((item) => item.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectItem = (item: NormalizedInventoryItem, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, item.id]);
        } else {
            setSelectedIds(selectedIds.filter((id) => id !== item.id));
        }
    };

    const handleSelectGroup = (group: GroupedInventory, checked: boolean) => {
        const groupIds = group.items.map((item) => item.id);
        if (checked) {
            setSelectedIds([...new Set([...selectedIds, ...groupIds])]);
        } else {
            setSelectedIds(selectedIds.filter((id) => !groupIds.includes(id)));
        }
    };

    const isItemSelected = (item: NormalizedInventoryItem) => selectedIds.includes(item.id);
    const isGroupSelected = (group: GroupedInventory) => group.items.every((item) => isItemSelected(item));
    const isGroupPartiallySelected = (group: GroupedInventory) => {
        const selectedCount = group.items.filter((item) => isItemSelected(item)).length;
        return selectedCount > 0 && selectedCount < group.items.length;
    };

    const handleMarkSold = () => {
        if (selectedIds.length === 0) return;
        router.post('/riftbound/inventory/mark-sold', { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const handleMoveToCollection = () => {
        if (selectedIds.length === 0) return;
        router.post('/riftbound/inventory/move-to-collection', { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const handleDelete = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`${selectedIds.length} Karte(n) wirklich löschen?`)) return;
        router.post('/riftbound/inventory/delete-multiple', { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Riftbound Inventar" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Riftbound - Inventar</h1>
                        <p className="text-muted-foreground">
                            {stats.total} Karten im Inventar, {stats.sold} verkauft
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
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                        <span className="text-sm font-medium">{selectedIds.length} ausgewählt</span>
                        <div className="flex-1" />
                        <Button variant="outline" size="sm" onClick={handleMoveToCollection}>
                            <Heart className="mr-2 h-4 w-4" />
                            In Sammlung
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleMarkSold}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Verkauft
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                        </Button>
                    </div>
                )}

                {/* Inventory Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={selectedIds.length === normalizedItems.length && normalizedItems.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                    />
                                </TableHead>
                                <TableHead>Karte</TableHead>
                                <TableHead>Set</TableHead>
                                <TableHead>Zustand</TableHead>
                                <TableHead>Lot</TableHead>
                                <TableHead className="text-right">Preis</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedInventory.map((group) => (
                                <>
                                    <TableRow
                                        key={group.key}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => toggleGroup(group.key)}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isGroupSelected(group)}
                                                ref={(ref) => {
                                                    if (ref) {
                                                        (ref as HTMLButtonElement).dataset.state = isGroupPartiallySelected(group)
                                                            ? 'indeterminate'
                                                            : isGroupSelected(group)
                                                              ? 'checked'
                                                              : 'unchecked';
                                                    }
                                                }}
                                                onCheckedChange={(checked) => handleSelectGroup(group, checked as boolean)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {expandedGroups.has(group.key) ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                                {group.imageUrl && (
                                                    <img
                                                        src={group.imageUrl}
                                                        alt={group.cardName}
                                                        className="h-10 w-auto rounded"
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-medium">{group.cardName}</div>
                                                    <div className="text-muted-foreground text-sm">
                                                        {group.items.length}x
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {group.setName}
                                                <div className="text-muted-foreground">{group.collectorNumber}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {group.totalValue > 0 ? `${group.totalValue.toFixed(2)} €` : '-'}
                                        </TableCell>
                                    </TableRow>
                                    {expandedGroups.has(group.key) &&
                                        group.items.map((item) => (
                                            <TableRow key={item.id} className="bg-muted/30">
                                                <TableCell>
                                                    <Checkbox
                                                        checked={isItemSelected(item)}
                                                        onCheckedChange={(checked) =>
                                                            handleSelectItem(item, checked as boolean)
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="pl-12">
                                                    <span className="text-muted-foreground">└</span>
                                                </TableCell>
                                                <TableCell>-</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{item.condition}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {item.lot_number && (
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <Package className="h-3 w-3" />
                                                            {item.lot_number}
                                                            {item.box_name && (
                                                                <span className="text-muted-foreground">
                                                                    ({item.box_name})
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.price ? `${item.price.toFixed(2)} €` : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </>
                            ))}
                            {groupedInventory.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        Keine Karten im Inventar
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {inventory.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {inventory.links.map((link, index) => (
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
