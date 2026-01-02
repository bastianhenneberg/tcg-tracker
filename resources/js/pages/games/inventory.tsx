import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Package, ShoppingCart, Heart, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Game {
    id: number;
    slug: string;
    name: string;
}

interface CustomPrinting {
    id: number;
    set_name: string | null;
    collector_number: string | null;
    rarity: string | null;
    foiling: string | null;
    image_url: string | null;
    card: {
        id: number;
        name: string;
    };
}

interface InventoryItem {
    id: number;
    condition: string;
    language: string;
    price: number | null;
    position_in_lot: number;
    lot_id: number;
    printing: CustomPrinting;
    lot?: {
        id: number;
        lot_number: string;
        box?: {
            id: number;
            name: string;
        };
    };
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface GroupedInventory {
    key: string;
    cardName: string;
    setName: string;
    collectorNumber: string;
    rarity: string | null;
    foiling: string | null;
    imageUrl: string | null;
    cardId: number;
    items: InventoryItem[];
    totalValue: number;
}

interface Props {
    game: Game;
    inventory: PaginatedData<InventoryItem>;
    filters: {
        search?: string;
        condition?: string;
        lot?: string;
    };
    conditions: Record<string, string>;
    foilings: Record<string, string>;
    stats: {
        total: number;
        sold: number;
    };
}

const LANGUAGES: Record<string, string> = {
    DE: 'Deutsch',
    EN: 'English',
    FR: 'Français',
    ES: 'Español',
    IT: 'Italiano',
};

export default function GameInventory({ game, inventory, filters, conditions, foilings, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/games/${game.slug}/cards` },
        { title: 'Inventar', href: `/games/${game.slug}/inventory` },
    ];

    // Group inventory items by card
    const groupedInventory = useMemo(() => {
        const groups = new Map<string, GroupedInventory>();

        inventory.data.forEach((item) => {
            const key = `${item.printing.card.name}-${item.printing.set_name ?? 'custom'}-${item.printing.collector_number ?? '-'}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    cardName: item.printing.card.name,
                    setName: item.printing.set_name ?? 'Custom',
                    collectorNumber: item.printing.collector_number ?? '-',
                    rarity: item.printing.rarity,
                    foiling: item.printing.foiling,
                    imageUrl: item.printing.image_url,
                    cardId: item.printing.card.id,
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
            `/games/${game.slug}/inventory`,
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
            `/games/${game.slug}/inventory`,
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

    const handleSelectItem = (item: InventoryItem, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, item.id]);
        } else {
            setSelectedIds(selectedIds.filter((i) => i !== item.id));
        }
    };

    const handleSelectGroup = (group: GroupedInventory, checked: boolean) => {
        const groupItemIds = group.items.map((item) => item.id);
        if (checked) {
            const existing = selectedIds.filter((id) => !groupItemIds.includes(id));
            setSelectedIds([...existing, ...groupItemIds]);
        } else {
            setSelectedIds(selectedIds.filter((id) => !groupItemIds.includes(id)));
        }
    };

    const isItemSelected = (item: InventoryItem) => selectedIds.includes(item.id);

    const isGroupSelected = (group: GroupedInventory) => {
        return group.items.every((item) => isItemSelected(item));
    };

    const isGroupPartiallySelected = (group: GroupedInventory) => {
        const selectedCount = group.items.filter((item) => isItemSelected(item)).length;
        return selectedCount > 0 && selectedCount < group.items.length;
    };

    const handleMarkSold = () => {
        if (selectedIds.length === 0) return;
        router.post(`/games/${game.slug}/inventory/mark-sold`, { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const handleMoveToCollection = () => {
        if (selectedIds.length === 0) return;
        router.post(`/games/${game.slug}/inventory/move-to-collection`, { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    const handleDelete = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`${selectedIds.length} Karte(n) wirklich löschen?`)) return;

        router.post(`/games/${game.slug}/inventory/delete-multiple`, { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${game.name} Inventar`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{game.name} - Inventar</h1>
                        <p className="text-muted-foreground">
                            {stats.total} Karten im Inventar, {stats.sold} verkauft
                        </p>
                    </div>
                    <Button onClick={() => router.visit(`/games/${game.slug}/scanner`)}>
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
                                <TableHead>Foiling</TableHead>
                                <TableHead>Sprache</TableHead>
                                <TableHead>Wert</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedInventory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        Keine Karten im Inventar
                                    </TableCell>
                                </TableRow>
                            ) : (
                                groupedInventory.map((group) => (
                                    <React.Fragment key={group.key}>
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
                                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                                    {expandedGroups.has(group.key) ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <CardImage
                                                        src={group.imageUrl}
                                                        alt={group.cardName}
                                                        className="h-12 w-auto rounded"
                                                        placeholderClassName="h-12 w-9 rounded"
                                                    />
                                                    <div>
                                                        <div className="font-medium">{group.cardName}</div>
                                                        <div className="text-muted-foreground text-sm">
                                                            {group.setName} - {group.collectorNumber}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{group.items.length}x</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {group.foiling ? (foilings[group.foiling] ?? group.foiling) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const languages = [...new Set(group.items.map(i => i.language))];
                                                    if (languages.length === 1) {
                                                        return LANGUAGES[languages[0]] ?? languages[0];
                                                    }
                                                    return `${languages.length} Sprachen`;
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                {group.totalValue > 0 ? `${group.totalValue.toFixed(2)} €` : '-'}
                                            </TableCell>
                                        </TableRow>
                                        {expandedGroups.has(group.key) && group.items.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                className="bg-muted/30 hover:bg-muted/50"
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isItemSelected(item)}
                                                        onCheckedChange={(checked) => handleSelectItem(item, !!checked)}
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
                                                    <Badge variant="outline">{conditions[item.condition] ?? item.condition}</Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    Pos. {item.position_in_lot}
                                                </TableCell>
                                                <TableCell>
                                                    {LANGUAGES[item.language] ?? item.language}
                                                </TableCell>
                                                <TableCell>
                                                    {item.price ? `${Number(item.price).toFixed(2)} €` : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
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
