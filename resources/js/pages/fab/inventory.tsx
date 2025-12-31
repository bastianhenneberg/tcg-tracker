import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type FabInventory,
    type FabInventoryFilters,
    type PaginatedData,
    getConditionLabel,
    getRarityLabel,
    getFoilingLabel,
    getLanguageLabel,
} from '@/types/fab';
import { printing as printingRoute } from '@/actions/App/Http/Controllers/Fab/FabCardController';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Package, ShoppingCart, Heart, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface GroupedInventory {
    key: string;
    printingId: number;
    cardName: string;
    setName: string;
    collectorNumber: string;
    rarity: string | null;
    foiling: string | null;
    imageUrl: string | null;
    items: FabInventory[];
    totalValue: number;
}

interface Props {
    inventory: PaginatedData<FabInventory>;
    filters: FabInventoryFilters;
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
        title: 'Flesh and Blood',
        href: '/fab/cards',
    },
    {
        title: 'Inventar',
        href: '/fab/inventory',
    },
];

export default function FabInventoryIndex({ inventory, filters, conditions, rarities, foilings, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Group inventory items by printing
    const groupedInventory = useMemo(() => {
        const groups = new Map<string, GroupedInventory>();

        inventory.data.forEach((item) => {
            const key = `${item.fab_printing_id}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    printingId: item.fab_printing_id,
                    cardName: item.printing?.card?.name ?? 'Unbekannt',
                    setName: item.printing?.set?.name ?? item.printing?.set?.external_id ?? '',
                    collectorNumber: item.printing?.collector_number ?? '',
                    rarity: item.printing?.rarity ?? null,
                    foiling: item.printing?.foiling ?? null,
                    imageUrl: item.printing?.image_url ?? null,
                    items: [],
                    totalValue: 0,
                });
            }

            const group = groups.get(key)!;
            group.items.push(item);
            group.totalValue += item.price ?? 0;
        });

        return Array.from(groups.values()).sort((a, b) => a.cardName.localeCompare(b.cardName));
    }, [inventory.data]);

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/fab/inventory',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleFilterChange = (key: keyof FabInventoryFilters, value: string | undefined) => {
        router.get(
            '/fab/inventory',
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
            setSelectedIds(inventory.data.map((item) => item.id));
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

    const handleSelectGroup = (group: GroupedInventory, checked: boolean) => {
        const groupIds = group.items.map((item) => item.id);
        if (checked) {
            setSelectedIds([...new Set([...selectedIds, ...groupIds])]);
        } else {
            setSelectedIds(selectedIds.filter((id) => !groupIds.includes(id)));
        }
    };

    const isGroupSelected = (group: GroupedInventory) => {
        return group.items.every((item) => selectedIds.includes(item.id));
    };

    const isGroupPartiallySelected = (group: GroupedInventory) => {
        const selectedCount = group.items.filter((item) => selectedIds.includes(item.id)).length;
        return selectedCount > 0 && selectedCount < group.items.length;
    };

    const handleMarkSold = () => {
        if (selectedIds.length === 0) return;
        router.post('/fab/inventory/mark-sold', { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const handleMoveToCollection = () => {
        if (selectedIds.length === 0) return;
        router.post('/fab/inventory/move-to-collection', { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const handleDelete = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`${selectedIds.length} Karte(n) wirklich löschen?`)) return;

        router.post('/fab/inventory/delete-multiple', { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="FaB Inventar" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Flesh and Blood - Inventar</h1>
                        <p className="text-muted-foreground">
                            {stats.total} Karten im Inventar, {stats.sold} verkauft
                        </p>
                    </div>
                    <Button onClick={() => router.visit('/fab/scanner')}>
                        <Package className="mr-2 h-4 w-4" />
                        Scanner öffnen
                    </Button>
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

                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
                        <span className="text-sm">{selectedIds.length} ausgewählt</span>
                        <Button variant="outline" size="sm" onClick={handleMarkSold}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Als verkauft markieren
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleMoveToCollection}>
                            <Heart className="mr-2 h-4 w-4" />
                            In Sammlung verschieben
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                        </Button>
                    </div>
                )}

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={selectedIds.length === inventory.data.length && inventory.data.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    />
                                </TableHead>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Karte</TableHead>
                                <TableHead>Anzahl</TableHead>
                                <TableHead>Seltenheit</TableHead>
                                <TableHead>Foiling</TableHead>
                                <TableHead>Sprache</TableHead>
                                <TableHead>Wert</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedInventory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        Keine Karten im Inventar
                                    </TableCell>
                                </TableRow>
                            ) : (
                                groupedInventory.map((group) => (
                                    <Collapsible key={group.key} asChild open={expandedGroups.has(group.key)}>
                                        <>
                                            <TableRow
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => toggleGroup(group.key)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isGroupSelected(group)}
                                                        ref={(el) => {
                                                            if (el) {
                                                                (el as HTMLButtonElement).indeterminate = isGroupPartiallySelected(group);
                                                            }
                                                        }}
                                                        onCheckedChange={(checked) => handleSelectGroup(group, !!checked)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <CollapsibleTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                            {expandedGroups.has(group.key) ? (
                                                                <ChevronDown className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </CollapsibleTrigger>
                                                </TableCell>
                                                <TableCell>
                                                    <Link
                                                        href={printingRoute.url(group.printingId)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex items-center gap-3 hover:opacity-80"
                                                    >
                                                        {group.imageUrl && (
                                                            <img
                                                                src={group.imageUrl}
                                                                alt={group.cardName}
                                                                className="h-12 w-auto rounded"
                                                            />
                                                        )}
                                                        <div>
                                                            <div className="font-medium hover:underline">{group.cardName}</div>
                                                            <div className="text-muted-foreground text-sm">
                                                                {group.setName} - {group.collectorNumber}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{group.items.length}x</Badge>
                                                </TableCell>
                                                <TableCell>{getRarityLabel(group.rarity)}</TableCell>
                                                <TableCell>{getFoilingLabel(group.foiling)}</TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const languages = [...new Set(group.items.map(i => i.language))];
                                                        if (languages.length === 1) {
                                                            return getLanguageLabel(languages[0]);
                                                        }
                                                        return `${languages.length} Sprachen`;
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    {group.totalValue > 0 ? `${group.totalValue.toFixed(2)} €` : '-'}
                                                </TableCell>
                                            </TableRow>
                                            <CollapsibleContent asChild>
                                                <>
                                                    {group.items.map((item) => (
                                                        <TableRow
                                                            key={item.id}
                                                            className="bg-muted/30 hover:bg-muted/50"
                                                        >
                                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                                <Checkbox
                                                                    checked={selectedIds.includes(item.id)}
                                                                    onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                                                                />
                                                            </TableCell>
                                                            <TableCell></TableCell>
                                                            <TableCell className="pl-16">
                                                                <span className="text-muted-foreground">└</span>
                                                                {' '}Lot {item.lot?.lot_number ?? '-'}
                                                                {item.lot?.box && (
                                                                    <span className="text-muted-foreground"> ({item.lot.box.name})</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{getConditionLabel(item.condition)}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-sm">
                                                                Pos. {item.position_in_lot}
                                                            </TableCell>
                                                            <TableCell></TableCell>
                                                            <TableCell>
                                                                {getLanguageLabel(item.language)}
                                                            </TableCell>
                                                            <TableCell>
                                                                {item.price ? `${item.price.toFixed(2)} €` : '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </>
                                            </CollapsibleContent>
                                        </>
                                    </Collapsible>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {inventory.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Seite {inventory.current_page} von {inventory.last_page}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!inventory.prev_page_url}
                                onClick={() => router.get(inventory.prev_page_url!, {}, { preserveState: true })}
                            >
                                Zurück
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!inventory.next_page_url}
                                onClick={() => router.get(inventory.next_page_url!, {}, { preserveState: true })}
                            >
                                Weiter
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
