import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Deck, DeckStatistics, DeckValidation, DeckZoneWithCards } from '@/types/deck';
import { Game } from '@/types/unified';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle, Download, Edit, XCircle } from 'lucide-react';

interface Props {
    game: Game;
    deck: Deck;
    zones: DeckZoneWithCards[];
    validation: DeckValidation;
    statistics: DeckStatistics;
}

export default function DecksShow({ game, deck, zones, validation, statistics }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/g/${game.slug}/inventory` },
        { title: 'Decks', href: `/g/${game.slug}/decks` },
        { title: deck.name, href: `/g/${game.slug}/decks/${deck.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${deck.name} - ${game.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/g/${game.slug}/decks`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">{deck.name}</h1>
                            <p className="text-muted-foreground text-sm">
                                {deck.game_format?.name}
                                {deck.description && ` - ${deck.description}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <a href={`/g/${game.slug}/decks/${deck.id}/export/txt`} download>
                            <Button variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </a>
                        <Link href={`/g/${game.slug}/decks/${deck.id}/builder`}>
                            <Button>
                                <Edit className="mr-2 h-4 w-4" />
                                Bearbeiten
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                    {/* Validation Status */}
                    <Card className="lg:col-span-4">
                        <CardContent className="flex items-center gap-4 py-4">
                            {validation.valid ? (
                                <>
                                    <CheckCircle className="h-6 w-6 text-green-500" />
                                    <span className="font-medium text-green-600">Deck ist gültig</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-6 w-6 text-red-500" />
                                    <div className="flex flex-wrap gap-2">
                                        {validation.errors.map((error, i) => (
                                            <span
                                                key={i}
                                                className="rounded bg-red-100 px-2 py-1 text-sm text-red-700 dark:bg-red-900 dark:text-red-300"
                                            >
                                                {error.message}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Deck Zones */}
                    <div className="space-y-4 lg:col-span-3">
                        {zones.map(({ zone, cards, count }) => (
                            <Card key={zone.id}>
                                <CardHeader className="py-3">
                                    <CardTitle className="flex items-center justify-between text-lg">
                                        <span>{zone.name}</span>
                                        <span className="text-muted-foreground text-sm font-normal">
                                            {count}
                                            {zone.min_cards > 0 && `/${zone.min_cards}`}
                                            {zone.max_cards && zone.min_cards !== zone.max_cards && `-${zone.max_cards}`}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {cards.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">Keine Karten</p>
                                    ) : (
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {cards.map((card) => (
                                                <div
                                                    key={card.id}
                                                    className="flex items-center gap-2 rounded border p-2"
                                                >
                                                    {card.printing?.image_url_small && (
                                                        <img
                                                            src={card.printing.image_url_small}
                                                            alt={card.printing.card?.name}
                                                            className="h-12 w-auto rounded"
                                                        />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">
                                                            {card.quantity}x {card.printing?.card?.name}
                                                        </p>
                                                        <p className="text-muted-foreground truncate text-xs">
                                                            {card.printing?.set_name}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Statistics */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-lg">Statistiken</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-muted-foreground text-sm">Karten gesamt</p>
                                    <p className="text-2xl font-bold">{statistics.total_cards}</p>
                                </div>

                                {Object.keys(statistics.mana_curve).length > 0 && (
                                    <div>
                                        <p className="text-muted-foreground mb-2 text-sm">Manakurve</p>
                                        <div className="flex items-end gap-1">
                                            {Object.entries(statistics.mana_curve).map(([cost, count]) => {
                                                const maxCount = Math.max(...Object.values(statistics.mana_curve));
                                                const height = (count / maxCount) * 60;
                                                return (
                                                    <div key={cost} className="flex flex-col items-center">
                                                        <div
                                                            className="w-6 rounded-t bg-primary"
                                                            style={{ height: `${height}px` }}
                                                            title={`${count} Karten`}
                                                        />
                                                        <span className="text-muted-foreground text-xs">{cost}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {Object.keys(statistics.type_distribution).length > 0 && (
                                    <div>
                                        <p className="text-muted-foreground mb-2 text-sm">Typen</p>
                                        <div className="space-y-1">
                                            {Object.entries(statistics.type_distribution)
                                                .sort(([, a], [, b]) => b - a)
                                                .slice(0, 5)
                                                .map(([type, count]) => (
                                                    <div key={type} className="flex justify-between text-sm">
                                                        <span className="truncate">{type}</span>
                                                        <span className="text-muted-foreground">{count}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
