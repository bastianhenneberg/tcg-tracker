import { DataTable, type ColumnDef, type PaginatedData } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
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
import AppLayout from '@/layouts/app-layout';
import { index as boxesIndex, show as boxShow, store as boxStore } from '@/routes/boxes';
import { type BreadcrumbItem } from '@/types';
import { type Box } from '@/types/inventory';
import { Head, router, useForm } from '@inertiajs/react';
import { Package, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface BoxWithCount extends Box {
    lots_count: number;
}

interface Filters {
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
}

interface Props {
    boxes: PaginatedData<BoxWithCount>;
    filters: Filters;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Kartons',
        href: boxesIndex().url,
    },
];

export default function BoxesIndex({ boxes, filters }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');

    const form = useForm({
        name: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(boxStore().url, {
            onSuccess: () => {
                setDialogOpen(false);
                form.reset();
            },
        });
    };

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            boxesIndex().url,
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleSortChange = (sort: { field: string; direction: 'asc' | 'desc' }) => {
        router.get(
            boxesIndex().url,
            { ...filters, sort: sort.field, direction: sort.direction },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (box: BoxWithCount) => {
        router.visit(boxShow(box).url);
    };

    const columns = useMemo<ColumnDef<BoxWithCount, unknown>[]>(
        () => [
            {
                id: 'name',
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => {
                    const box = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div>
                                <p className="font-medium">{box.name}</p>
                                {box.description && (
                                    <p className="text-muted-foreground text-sm truncate max-w-md">
                                        {box.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'lots_count',
                accessorKey: 'lots_count',
                header: 'Lots',
                cell: ({ row }) => (
                    <span className="text-muted-foreground">{row.original.lots_count}</span>
                ),
            },
            {
                id: 'created_at',
                accessorKey: 'created_at',
                header: 'Erstellt',
                cell: ({ row }) => (
                    <span className="text-muted-foreground text-sm">
                        {new Date(row.original.created_at).toLocaleDateString('de-DE')}
                    </span>
                ),
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Kartons" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Kartons</h1>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Neuer Karton
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Neuen Karton erstellen</DialogTitle>
                                <DialogDescription>
                                    Erstelle einen neuen Karton zur physischen Aufbewahrung deiner Karten.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        placeholder="z.B. FaB Box 1"
                                        autoFocus
                                    />
                                    {form.errors.name && (
                                        <p className="text-destructive text-sm">{form.errors.name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Beschreibung (optional)</Label>
                                    <Input
                                        id="description"
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        placeholder="z.B. Regal oben links"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                        Abbrechen
                                    </Button>
                                    <Button type="submit" disabled={form.processing}>
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
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Karton suchen..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="max-w-sm pl-9"
                        />
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={boxes}
                    onRowClick={handleRowClick}
                    sort={filters.sort ? { field: filters.sort, direction: filters.direction ?? 'asc' } : undefined}
                    onSortChange={handleSortChange}
                    emptyState={
                        <div className="flex flex-col items-center justify-center py-12">
                            <Package className="h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-2 text-muted-foreground">Keine Kartons gefunden</p>
                            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Ersten Karton erstellen
                            </Button>
                        </div>
                    }
                />
            </div>
        </AppLayout>
    );
}
