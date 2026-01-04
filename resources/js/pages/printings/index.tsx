import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type Game,
    type PaginatedData,
    type UnifiedPrinting,
    type UnifiedSet,
} from '@/types/unified';
import { Head, Link, router } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
    game: Game;
    printings: PaginatedData<UnifiedPrinting>;
    sets: Pick<UnifiedSet, 'id' | 'name' | 'code'>[];
    filters: Record<string, string | undefined>;
    rarities: Record<string, string>;
    foilings: Record<string, string>;
}

export default function PrintingsIndex({
    game,
    printings,
    sets,
    filters,
    rarities,
    foilings,
}: Props) {
    const baseUrl = `/g/${game.slug}`;
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `${baseUrl}/cards` },
        { title: 'Printings', href: `${baseUrl}/printings` },
    ];

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            `${baseUrl}/printings`,
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
            `${baseUrl}/printings`,
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${game.name} - Printings`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">{game.name} - Printings</h1>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <Input
                            placeholder="Printing suchen..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {sets.length > 0 && (
                            <Select
                                value={filters.set ?? 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('set', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Alle Sets" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Sets</SelectItem>
                                    {sets.map((set) => (
                                        <SelectItem key={set.id} value={set.id.toString()}>
                                            [{set.code}] {set.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {Object.keys(rarities).length > 0 && (
                            <Select
                                value={filters.rarity ?? 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('rarity', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Alle Seltenheiten" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Seltenheiten</SelectItem>
                                    {Object.entries(rarities).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {Object.keys(foilings).length > 0 && (
                            <Select
                                value={filters.finish ?? 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('finish', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Alle Finishes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alle Finishes</SelectItem>
                                    {Object.entries(foilings).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                {/* Grid */}
                {printings.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Sparkles className="h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-2 text-muted-foreground">Keine Printings gefunden</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {printings.data.map((printing) => (
                            <Link
                                key={printing.id}
                                href={`${baseUrl}/printings/${printing.id}`}
                                className="group flex gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                            >
                                {printing.image_url && (
                                    <img
                                        src={printing.image_url}
                                        alt={printing.card?.name}
                                        className="h-20 w-auto rounded"
                                    />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">
                                        {printing.card?.name}
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        {printing.set_name ?? printing.set_code}
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        #{printing.collector_number}
                                    </p>
                                    <div className="mt-1 flex gap-1">
                                        {printing.rarity_label && (
                                            <Badge variant="outline" className="text-xs">
                                                {printing.rarity_label}
                                            </Badge>
                                        )}
                                        {printing.finish_label && printing.finish !== 'standard' && (
                                            <Badge variant="secondary" className="text-xs">
                                                {printing.finish_label}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {printings.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        {printings.links.map((link, index) => (
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
