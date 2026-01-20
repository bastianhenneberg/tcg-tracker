import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef, type PaginatedData } from '@/components/ui/data-table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Deck, GameFormat } from '@/types/deck';
import { Game } from '@/types/unified';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Edit, Eye, Layers, Package, PackageX, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

interface DeckWithRelations extends Deck {
    game_format: GameFormat;
    cards_count: number;
}

interface Props {
    game: Game;
    decks: PaginatedData<DeckWithRelations>;
    sort: {
        field: string;
        direction: 'asc' | 'desc';
    };
}

export default function DecksIndex({ game, decks, sort }: Props) {
    const { props } = usePage<{ flash?: { success?: string; warning?: string; error?: string } }>();

    useEffect(() => {
        if (props.flash?.success) toast.success(props.flash.success);
        if (props.flash?.warning) toast.warning(props.flash.warning);
        if (props.flash?.error) toast.error(props.flash.error);
    }, [props.flash]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/g/${game.slug}/inventory` },
        { title: 'Decks', href: `/g/${game.slug}/decks` },
    ];

    const handleToggleInventory = (e: React.MouseEvent, deck: DeckWithRelations) => {
        e.stopPropagation();
        if (deck.is_inventory_active) {
            router.delete(`/g/${game.slug}/decks/${deck.id}/mark-in-deck`);
        } else {
            router.post(`/g/${game.slug}/decks/${deck.id}/mark-in-deck`);
        }
    };

    const handleDelete = (e: React.MouseEvent, deck: Deck) => {
        e.stopPropagation();
        if (confirm(`Deck "${deck.name}" wirklich löschen?`)) {
            router.delete(`/g/${game.slug}/decks/${deck.id}`);
        }
    };

    const handleSortChange = (newSort: { field: string; direction: 'asc' | 'desc' }) => {
        router.get(
            `/g/${game.slug}/decks`,
            { sort: newSort.field, direction: newSort.direction },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRowClick = (deck: DeckWithRelations) => {
        router.visit(`/g/${game.slug}/decks/${deck.id}`);
    };

    const columns = useMemo<ColumnDef<DeckWithRelations, unknown>[]>(
        () => [
            {
                id: 'name',
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <span className="font-medium">{row.original.name}</span>
                            {row.original.description && (
                                <p className="text-muted-foreground text-sm truncate max-w-xs">
                                    {row.original.description}
                                </p>
                            )}
                        </div>
                    </div>
                ),
            },
            {
                id: 'format',
                accessorFn: (row) => row.game_format?.name,
                header: 'Format',
                cell: ({ row }) => (
                    <Badge variant="outline">{row.original.game_format?.name}</Badge>
                ),
            },
            {
                id: 'cards_count',
                accessorKey: 'cards_count',
                header: 'Karten',
                cell: ({ row }) => (
                    <span className="text-muted-foreground">{row.original.cards_count}</span>
                ),
            },
            {
                id: 'status',
                header: 'Status',
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="flex flex-wrap gap-1">
                        {row.original.is_inventory_active && (
                            <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
                                Im Deck
                            </Badge>
                        )}
                        {row.original.is_public && (
                            <Badge variant="secondary" className="text-green-600">
                                Öffentlich
                            </Badge>
                        )}
                        {row.original.use_collection_only && (
                            <Badge variant="secondary" className="text-blue-600">
                                Sammlung
                            </Badge>
                        )}
                    </div>
                ),
            },
            {
                id: 'updated_at',
                accessorKey: 'updated_at',
                header: 'Aktualisiert',
                cell: ({ row }) => (
                    <span className="text-muted-foreground text-sm">
                        {new Date(row.original.updated_at).toLocaleDateString('de-DE')}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: '',
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="flex gap-1 justify-end">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 ${row.original.is_inventory_active ? 'text-amber-500' : ''}`}
                                    onClick={(e) => handleToggleInventory(e, row.original)}
                                >
                                    {row.original.is_inventory_active ? (
                                        <PackageX className="h-4 w-4" />
                                    ) : (
                                        <Package className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {row.original.is_inventory_active
                                    ? 'Inventar-Markierung aufheben'
                                    : 'Als "Im Deck" markieren'}
                            </TooltipContent>
                        </Tooltip>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.visit(`/g/${game.slug}/decks/${row.original.id}`);
                            }}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.visit(`/g/${game.slug}/decks/${row.original.id}/builder`);
                            }}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => handleDelete(e, row.original)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ),
            },
        ],
        [game.slug]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Decks - ${game.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Decks</h1>
                        <p className="text-muted-foreground text-sm">
                            Erstelle und verwalte deine {game.name} Decks
                        </p>
                    </div>

                    <Link href={`/g/${game.slug}/decks/create`}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Neues Deck
                        </Button>
                    </Link>
                </div>

                <DataTable
                    columns={columns}
                    data={decks}
                    onRowClick={handleRowClick}
                    sort={sort}
                    onSortChange={handleSortChange}
                    emptyState={
                        <div className="flex flex-col items-center justify-center py-12">
                            <Layers className="text-muted-foreground mb-4 h-12 w-12" />
                            <h3 className="text-lg font-medium">Keine Decks</h3>
                            <p className="text-muted-foreground mb-4 text-center">
                                Erstelle dein erstes {game.name} Deck.
                            </p>
                            <Link href={`/g/${game.slug}/decks/create`}>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Erstes Deck erstellen
                                </Button>
                            </Link>
                        </div>
                    }
                />
            </div>
        </AppLayout>
    );
}
