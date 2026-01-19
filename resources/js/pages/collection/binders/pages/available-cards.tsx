import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type PaginatedData, type UnifiedInventory } from '@/types/unified';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Search } from 'lucide-react';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface BinderPage {
    id: number;
    page_number: number;
    binder: {
        id: number;
        name: string;
    };
}

interface Props {
    binderPage: BinderPage;
    cards: PaginatedData<UnifiedInventory>;
    filters: Record<string, string | undefined>;
}

export default function AvailableCards({ binderPage, cards, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Ordner', href: '/binders' },
        { title: binderPage.binder.name, href: `/binders/${binderPage.binder.id}` },
        { title: `Seite ${binderPage.page_number}`, href: `/binder-pages/${binderPage.id}` },
        { title: 'Karten auswählen', href: `/binder-pages/${binderPage.id}/available-cards` },
    ];

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            `/binder-pages/${binderPage.id}/available-cards`,
            { search: value || undefined },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        debouncedSearch(value);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Karten auswählen" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={`/binder-pages/${binderPage.id}`}>
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Verfügbare Karten</h1>
                        <p className="text-muted-foreground text-sm">
                            Karten aus deiner Sammlung, die noch keinem Ordner zugewiesen sind
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                        placeholder="Karte suchen..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Cards Grid */}
                {cards.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground">
                            Keine verfügbaren Karten gefunden.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {cards.data.map((card) => (
                            <div
                                key={card.id}
                                className="group rounded-lg border p-2 transition-colors hover:border-primary"
                            >
                                {card.printing?.image_url ? (
                                    <img
                                        src={card.printing.image_url}
                                        alt={card.printing.card?.name ?? ''}
                                        className="aspect-[2.5/3.5] w-full rounded object-cover"
                                    />
                                ) : (
                                    <div className="bg-muted flex aspect-[2.5/3.5] items-center justify-center rounded">
                                        <span className="text-muted-foreground text-center text-xs">
                                            {card.printing?.card?.name}
                                        </span>
                                    </div>
                                )}
                                <p className="mt-2 truncate text-sm font-medium">
                                    {card.printing?.card?.name}
                                </p>
                                <p className="text-muted-foreground truncate text-xs">
                                    {card.printing?.set_name}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {cards.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        {cards.links.map((link, index) => (
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
