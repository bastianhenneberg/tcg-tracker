import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { PenSquare, Plus, Search } from 'lucide-react';
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
}

interface CustomCard {
    id: number;
    name: string;
    printings: CustomPrinting[];
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
    cards: PaginatedData<CustomCard>;
    filters: {
        search?: string;
    };
    rarities: Record<string, string>;
    foilings: Record<string, string>;
}

export default function GameCards({ game, cards, filters, rarities, foilings }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/games/${game.slug}/cards` },
        { title: 'Kartendatenbank', href: `/games/${game.slug}/cards` },
    ];

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(
            `/games/${game.slug}/cards`,
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
            <Head title={`${game.name} Karten`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{game.name} - Kartendatenbank</h1>
                        <p className="text-muted-foreground">
                            {cards.total} Karten
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/custom-cards">
                            <PenSquare className="mr-2 h-4 w-4" />
                            Karten verwalten
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Karte suchen..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="max-w-sm pl-9"
                        />
                    </div>
                </div>

                {cards.data.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8">
                        <div className="text-center">
                            <h3 className="text-lg font-medium">Keine Karten gefunden</h3>
                            <p className="text-muted-foreground">
                                {filters.search
                                    ? 'Versuche eine andere Suche.'
                                    : `Erstelle deine ersten ${game.name} Karten.`}
                            </p>
                        </div>
                        <Button asChild>
                            <Link href="/custom-cards">
                                <Plus className="mr-2 h-4 w-4" />
                                Karte erstellen
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {cards.data.map((card) => {
                                const primaryPrinting = card.printings[0];
                                return (
                                    <Card key={card.id} className="overflow-hidden">
                                        <div className="aspect-[5/7] relative bg-muted">
                                            {primaryPrinting?.image_url ? (
                                                <CardImage
                                                    src={primaryPrinting.image_url}
                                                    alt={card.name}
                                                    className="h-full w-full object-cover"
                                                    placeholderClassName="h-full w-full"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                    Kein Bild
                                                </div>
                                            )}
                                            {card.printings.length > 1 && (
                                                <Badge className="absolute top-2 right-2">
                                                    {card.printings.length} Drucke
                                                </Badge>
                                            )}
                                        </div>
                                        <CardContent className="p-3">
                                            <h3 className="font-medium truncate" title={card.name}>
                                                {card.name}
                                            </h3>
                                            {primaryPrinting && (
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    {primaryPrinting.set_name ?? 'Custom'}
                                                    {primaryPrinting.collector_number && (
                                                        <span> #{primaryPrinting.collector_number}</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {primaryPrinting?.rarity && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {rarities[primaryPrinting.rarity] ?? primaryPrinting.rarity}
                                                    </Badge>
                                                )}
                                                {primaryPrinting?.foiling && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {foilings[primaryPrinting.foiling] ?? primaryPrinting.foiling}
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {cards.last_page > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Seite {cards.current_page} von {cards.last_page}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!cards.prev_page_url}
                                        onClick={() => router.get(cards.prev_page_url!, {}, { preserveState: true })}
                                    >
                                        Zurück
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!cards.next_page_url}
                                        onClick={() => router.get(cards.next_page_url!, {}, { preserveState: true })}
                                    >
                                        Weiter
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
