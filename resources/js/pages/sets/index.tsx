import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Game, type PaginatedData, type UnifiedSet } from '@/types/unified';
import { Head, Link, router } from '@inertiajs/react';
import { Library } from 'lucide-react';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    game: Game;
    sets: PaginatedData<UnifiedSet & { printings_count: number }>;
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

                {/* Grid */}
                {sets.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Library className="h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-2 text-muted-foreground">Keine Sets gefunden</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {sets.data.map((set) => (
                            <Link
                                key={set.id}
                                href={`${baseUrl}/sets/${set.id}`}
                                className="group flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
                            >
                                <div className="flex items-start gap-3">
                                    {set.icon_url ? (
                                        <img
                                            src={set.icon_url}
                                            alt={set.name}
                                            className="h-8 w-8 object-contain"
                                        />
                                    ) : (
                                        <Library className="h-8 w-8 text-muted-foreground" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">{set.name}</p>
                                        <p className="text-muted-foreground text-sm">
                                            [{set.code}]
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{set.printings_count} Karten</span>
                                    {set.released_at && (
                                        <span>
                                            {new Date(set.released_at).toLocaleDateString('de-DE')}
                                        </span>
                                    )}
                                </div>
                                {set.set_type && (
                                    <span className="text-xs text-muted-foreground capitalize">
                                        {set.set_type}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {sets.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        {sets.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
