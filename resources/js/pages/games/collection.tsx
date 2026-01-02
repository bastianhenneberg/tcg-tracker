import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
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

interface CollectionItem {
    id: number;
    quantity: number;
    condition: string;
    language: string;
    notes: string | null;
    printing: CustomPrinting;
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

interface Props {
    game: Game;
    collection: PaginatedData<CollectionItem>;
    filters: {
        search?: string;
        condition?: string;
    };
    conditions: Record<string, string>;
    stats: {
        total: number;
        unique: number;
    };
}

const LANGUAGES: Record<string, string> = {
    DE: 'Deutsch',
    EN: 'English',
    FR: 'Français',
    ES: 'Español',
    IT: 'Italiano',
};

export default function GameCollection({ game, collection, filters, conditions, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/games/${game.slug}/cards` },
        { title: 'Sammlung', href: `/games/${game.slug}/collection` },
    ];

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            `/games/${game.slug}/collection`,
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
            `/games/${game.slug}/collection`,
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
        if (!confirm(`${selectedIds.length} Karte(n) wirklich aus der Sammlung löschen?`)) return;

        router.post(`/games/${game.slug}/collection/delete-multiple`, { ids: selectedIds }, {
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${game.name} Sammlung`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{game.name} - Sammlung</h1>
                        <p className="text-muted-foreground">
                            {stats.unique} verschiedene Karten, {stats.total} insgesamt
                        </p>
                    </div>
                    <Button onClick={() => router.visit(`/games/${game.slug}/inventory`)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Vom Inventar hinzufügen
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
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Aus Sammlung entfernen
                        </Button>
                    </div>
                )}

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={selectedIds.length === collection.data.length && collection.data.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    />
                                </TableHead>
                                <TableHead>Karte</TableHead>
                                <TableHead>Anzahl</TableHead>
                                <TableHead>Zustand</TableHead>
                                <TableHead>Sprache</TableHead>
                                <TableHead>Notizen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {collection.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        Keine Karten in der Sammlung
                                    </TableCell>
                                </TableRow>
                            ) : (
                                collection.data.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <CardImage
                                                    src={item.printing.image_url}
                                                    alt={item.printing.card.name}
                                                    className="h-12 w-auto rounded"
                                                    placeholderClassName="h-12 w-9 rounded"
                                                />
                                                <div>
                                                    <div className="font-medium">{item.printing.card.name}</div>
                                                    <div className="text-muted-foreground text-sm">
                                                        {item.printing.set_name ?? 'Custom'} - {item.printing.collector_number ?? '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{item.quantity}x</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{conditions[item.condition] ?? item.condition}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {LANGUAGES[item.language] ?? item.language}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {item.notes ?? '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {collection.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Seite {collection.current_page} von {collection.last_page}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!collection.prev_page_url}
                                onClick={() => router.get(collection.prev_page_url!, {}, { preserveState: true })}
                            >
                                Zurück
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!collection.next_page_url}
                                onClick={() => router.get(collection.next_page_url!, {}, { preserveState: true })}
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
