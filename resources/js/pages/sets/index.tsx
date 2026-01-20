import { DataTable, type ColumnDef, type PaginatedData } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Game, type UnifiedSet } from '@/types/unified';
import { Head, router } from '@inertiajs/react';
import { Library } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface SetWithCount extends UnifiedSet {
    printings_count: number;
}

interface Props {
    game: Game;
    sets: PaginatedData<SetWithCount>;
    filters: Record<string, string | undefined>;
}

export default function SetsIndex({ game, sets, filters }: Props) {
    const baseUrl = `/g/${game.slug}`;
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `${baseUrl}/cards` },
        { title: 'Sets', href: `${baseUrl}/sets` },
    ];

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            `${baseUrl}/sets`,
            { ...filters, search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    const handleRowClick = (set: SetWithCount) => {
        router.visit(`${baseUrl}/sets/${set.id}`);
    };

    const columns = useMemo<ColumnDef<SetWithCount, unknown>[]>(
        () => [
            {
                id: 'name',
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => {
                    const set = row.original;
                    return (
                        <div className="flex items-center gap-3">
                            {set.icon_url ? (
                                <img
                                    src={set.icon_url}
                                    alt={set.name}
                                    className="h-8 w-8 object-contain"
                                />
                            ) : (
                                <Library className="h-8 w-8 text-muted-foreground" />
                            )}
                            <div>
                                <p className="font-medium">{set.name}</p>
                                <p className="text-muted-foreground text-sm">[{set.code}]</p>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'printings_count',
                accessorKey: 'printings_count',
                header: 'Karten',
                cell: ({ row }) => (
                    <span className="text-muted-foreground">{row.original.printings_count}</span>
                ),
            },
            {
                id: 'set_type',
                accessorKey: 'set_type',
                header: 'Typ',
                cell: ({ row }) =>
                    row.original.set_type ? (
                        <span className="text-muted-foreground text-sm capitalize">
                            {row.original.set_type}
                        </span>
                    ) : (
                        '-'
                    ),
            },
            {
                id: 'released_at',
                accessorKey: 'released_at',
                header: 'Erschienen',
                cell: ({ row }) =>
                    row.original.released_at ? (
                        <span className="text-muted-foreground text-sm">
                            {new Date(row.original.released_at).toLocaleDateString('de-DE')}
                        </span>
                    ) : (
                        '-'
                    ),
            },
        ],
        []
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${game.name} - Sets`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">{game.name} - Sets</h1>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <Input
                            placeholder="Set suchen..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={sets}
                    onRowClick={handleRowClick}
                    emptyState={
                        <div className="flex flex-col items-center justify-center py-12">
                            <Library className="h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-2 text-muted-foreground">Keine Sets gefunden</p>
                        </div>
                    }
                />
            </div>
        </AppLayout>
    );
}
