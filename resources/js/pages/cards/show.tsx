import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Game, type UnifiedCard, getPitchColor } from '@/types/unified';
import { Head, Link } from '@inertiajs/react';

interface Props {
    game: Game;
    card: UnifiedCard;
}

export default function CardShow({ game, card }: Props) {
    const baseUrl = `/g/${game.slug}`;
    const pitch = card.game_specific?.pitch as number | undefined;
    const pitchColor = getPitchColor(pitch);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `${baseUrl}/cards` },
        { title: 'Kartendatenbank', href: `${baseUrl}/cards` },
        { title: card.name, href: `${baseUrl}/cards/${card.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${card.name} - ${game.name}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center gap-4">
                    <Link href={`${baseUrl}/cards`}>
                        <Button variant="outline" size="sm">
                            &larr; Zurück
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {card.name}
                        {pitch && (
                            <span
                                className={`inline-block h-4 w-4 rounded-full ${
                                    pitchColor === 'red'
                                        ? 'bg-red-500'
                                        : pitchColor === 'yellow'
                                          ? 'bg-yellow-500'
                                          : pitchColor === 'blue'
                                            ? 'bg-blue-500'
                                            : 'bg-gray-300'
                                }`}
                            />
                        )}
                    </h1>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Card Image */}
                    <Card>
                        <CardContent className="pt-6">
                            {card.printings?.[0]?.image_url ? (
                                <img
                                    src={card.printings[0].image_url}
                                    alt={card.name}
                                    className="w-full rounded-lg"
                                />
                            ) : (
                                <div className="bg-muted flex aspect-[2.5/3.5] items-center justify-center rounded-lg">
                                    <span className="text-muted-foreground">Kein Bild</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Main Card Info */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Kartendetails</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <span className="text-muted-foreground text-sm">Typ</span>
                                    <p className="font-medium">{card.type_line ?? card.types?.join(' ') ?? '-'}</p>
                                </div>
                                {card.cost && (
                                    <div>
                                        <span className="text-muted-foreground text-sm">Kosten</span>
                                        <p className="font-medium">{card.cost}</p>
                                    </div>
                                )}
                                {card.power && (
                                    <div>
                                        <span className="text-muted-foreground text-sm">Power</span>
                                        <p className="font-medium">{card.power}</p>
                                    </div>
                                )}
                                {card.defense && (
                                    <div>
                                        <span className="text-muted-foreground text-sm">Defense</span>
                                        <p className="font-medium">{card.defense}</p>
                                    </div>
                                )}
                                {card.health && (
                                    <div>
                                        <span className="text-muted-foreground text-sm">Health</span>
                                        <p className="font-medium">{card.health}</p>
                                    </div>
                                )}
                            </div>

                            {card.text && (
                                <div>
                                    <span className="text-muted-foreground text-sm">Text</span>
                                    <p className="mt-1 whitespace-pre-line">{card.text}</p>
                                </div>
                            )}

                            {card.colors.length > 0 && (
                                <div>
                                    <span className="text-muted-foreground text-sm">Farben</span>
                                    <div className="mt-1 flex gap-1">
                                        {card.colors.map((color) => (
                                            <Badge key={color} variant="secondary">
                                                {color}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {card.keywords.length > 0 && (
                                <div>
                                    <span className="text-muted-foreground text-sm">Keywords</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {card.keywords.map((keyword) => (
                                            <Badge key={keyword} variant="outline">
                                                {keyword}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {Object.keys(card.legalities).length > 0 && (
                                <div>
                                    <span className="text-muted-foreground text-sm">Legalität</span>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {Object.entries(card.legalities).map(([format, status]) => (
                                            <Badge
                                                key={format}
                                                variant={status === 'legal' ? 'default' : 'destructive'}
                                            >
                                                {format}: {status}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Printings */}
                {card.printings && card.printings.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Drucke ({card.printings.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {card.printings.map((printing) => (
                                    <Link
                                        key={printing.id}
                                        href={`${baseUrl}/printings/${printing.id}`}
                                        className="group flex gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                                    >
                                        {printing.image_url && (
                                            <img
                                                src={printing.image_url}
                                                alt={card.name}
                                                className="h-16 w-auto rounded"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium truncate">
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
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
