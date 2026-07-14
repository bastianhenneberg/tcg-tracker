import { Button } from '@/components/ui/button';
import {
    DataTable,
    type ColumnDef,
    type PaginatedData,
} from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { BookOpen, Plus, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Binder {
    id: number;
    name: string;
    description: string | null;
    color: string | null;
    pages_count: number;
    inventory_items_count: number;
    created_at: string;
}

interface Filters {
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
}

interface GameOption {
    slug: string;
    name: string;
    unified: string;
}

interface AvailableSet {
    id: number;
    code: string;
    name: string;
    printings_count: number;
}

interface Props {
    binders: PaginatedData<Binder>;
    games: GameOption[];
    filters: Filters;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ordner',
        href: '/binders',
    },
];

export default function BindersIndex({ binders, games, filters }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');

    const form = useForm({
        name: '',
        description: '',
        color: '',
        unified_set_id: null as number | null,
    });

    // Optional set link in the create dialog
    const [createGame, setCreateGame] = useState<string>(games[0]?.slug ?? '');
    const [createSets, setCreateSets] = useState<AvailableSet[]>([]);
    const [loadingCreateSets, setLoadingCreateSets] = useState(false);

    const loadCreateSets = useCallback(async (gameSlug: string) => {
        if (!gameSlug) return;
        setLoadingCreateSets(true);
        try {
            const response = await fetch(
                `/binders/available-sets?game=${encodeURIComponent(gameSlug)}`,
                {
                    headers: { Accept: 'application/json' },
                },
            );
            const data = await response.json();
            setCreateSets(data.sets ?? []);
        } catch (e) {
            console.error('Failed to load sets:', e);
            setCreateSets([]);
        } finally {
            setLoadingCreateSets(false);
        }
    }, []);

    const handleCreateGameChange = (slug: string) => {
        setCreateGame(slug);
        form.setData('unified_set_id', null);
        loadCreateSets(slug);
    };

    const handleDialogOpenChange = (open: boolean) => {
        setDialogOpen(open);
        if (open && createSets.length === 0) {
            loadCreateSets(createGame);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/binders', {
            onSuccess: () => {
                setDialogOpen(false);
                form.reset();
            },
        });
    };

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            '/binders',
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true },
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleSortChange = (sort: {
        field: string;
        direction: 'asc' | 'desc';
    }) => {
        router.get(
            '/binders',
            { ...filters, sort: sort.field, direction: sort.direction },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleRowClick = (binder: Binder) => {
        router.visit(`/binders/${binder.id}`);
    };

    const columns = useMemo<ColumnDef<Binder, unknown>[]>(
        () => [
            {
                id: 'name',
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => {
                    const binder = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <div>
                                <p className="font-medium">{binder.name}</p>
                                {binder.description && (
                                    <p className="max-w-md truncate text-sm text-muted-foreground">
                                        {binder.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'pages_count',
                accessorKey: 'pages_count',
                header: 'Seiten',
                cell: ({ row }) => (
                    <span className="text-muted-foreground">
                        {row.original.pages_count}
                    </span>
                ),
            },
            {
                id: 'inventory_items_count',
                accessorKey: 'inventory_items_count',
                header: 'Karten',
                cell: ({ row }) => (
                    <span className="text-muted-foreground">
                        {row.original.inventory_items_count}
                    </span>
                ),
            },
            {
                id: 'created_at',
                accessorKey: 'created_at',
                header: 'Erstellt',
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                        {new Date(row.original.created_at).toLocaleDateString(
                            'de-DE',
                        )}
                    </span>
                ),
            },
        ],
        [],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ordner" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Ordner</h1>
                        <p className="text-sm text-muted-foreground">
                            Organisiere deine Sammlung wie in echten
                            Sammelkarten-Ordnern
                        </p>
                    </div>

                    <Dialog
                        open={dialogOpen}
                        onOpenChange={handleDialogOpenChange}
                    >
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Neuer Ordner
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    Neuen Ordner erstellen
                                </DialogTitle>
                                <DialogDescription>
                                    Erstelle einen neuen Ordner mit 3x3 Seiten
                                    zur Präsentation deiner Sammlung.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                        placeholder="z.B. Meine Favoriten"
                                        autoFocus
                                    />
                                    {form.errors.name && (
                                        <p className="text-sm text-destructive">
                                            {form.errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">
                                        Beschreibung (optional)
                                    </Label>
                                    <Input
                                        id="description"
                                        value={form.data.description}
                                        onChange={(e) =>
                                            form.setData(
                                                'description',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="z.B. Seltene Karten & Full Arts"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label>Spiel (optional)</Label>
                                        <Select
                                            value={createGame}
                                            onValueChange={
                                                handleCreateGameChange
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Spiel" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {games.map((game) => (
                                                    <SelectItem
                                                        key={game.slug}
                                                        value={game.slug}
                                                    >
                                                        {game.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Set-Vorlage (optional)</Label>
                                        <Select
                                            value={
                                                form.data.unified_set_id
                                                    ? String(
                                                          form.data
                                                              .unified_set_id,
                                                      )
                                                    : ''
                                            }
                                            onValueChange={(v) =>
                                                form.setData(
                                                    'unified_set_id',
                                                    Number(v),
                                                )
                                            }
                                            disabled={loadingCreateSets}
                                        >
                                            <SelectTrigger>
                                                <SelectValue
                                                    placeholder={
                                                        loadingCreateSets
                                                            ? 'Lädt...'
                                                            : 'Kein Set'
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {createSets.map((set) => (
                                                    <SelectItem
                                                        key={set.id}
                                                        value={String(set.id)}
                                                    >
                                                        {set.name} [{set.code}]
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Mit Set-Vorlage kannst du danach im Ordner
                                    alle Karten des Sets als Blätter generieren.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                    >
                                        Abbrechen
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                    >
                                        Erstellen
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Search Filter */}
                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Ordner suchen..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="max-w-sm pl-9"
                        />
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={binders}
                    onRowClick={handleRowClick}
                    sort={
                        filters.sort
                            ? {
                                  field: filters.sort,
                                  direction: filters.direction ?? 'asc',
                              }
                            : undefined
                    }
                    onSortChange={handleSortChange}
                    emptyState={
                        <div className="flex flex-col items-center justify-center py-12">
                            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-2 text-muted-foreground">
                                Keine Ordner gefunden
                            </p>
                            <Button
                                className="mt-4"
                                onClick={() => handleDialogOpenChange(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Ersten Ordner erstellen
                            </Button>
                        </div>
                    }
                />
            </div>
        </AppLayout>
    );
}
