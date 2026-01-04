import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type Game, type UnifiedPrinting, getPitchColor } from '@/types/unified';
import { Head, Link } from '@inertiajs/react';

interface Props {
    game: Game;
    printing: UnifiedPrinting;
    allPrintings: UnifiedPrinting[];
    rarities: Record<string, string>;
    foilings: Record<string, string>;
}

export default function PrintingShow({
    game,
    printing,
    allPrintings,
    rarities,
    foilings,
}: Props) {
    const baseUrl = `/g/${game.slug}`;
    const card = printing.card;
    const pitch = card?.game_specific?.pitch as number | undefined;
    const pitchColor = getPitchColor(pitch);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `${baseUrl}/cards` },
        { title: 'Printings', href: `${baseUrl}/printings` },
        { title: card?.name ?? 'Printing', href: `${baseUrl}/printings/${printing.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${card?.name} - ${printing.set_name ?? printing.set_code} - ${game.name}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center gap-4">
                    <Link href={`${baseUrl}/printings`}>
                        <Button variant="outline" size="sm">
                            &larr; Zurück
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {card?.name}
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
                    {/* Printing Image */}
                    <Card>
                        <CardContent className="pt-6">
                            {printing.image_url ? (
                                <img
                                    src={printing.image_url}
                                    alt={card?.name}
                                    className="w-full rounded-lg"
                                />
                            ) : (
                                <div className="bg-muted flex aspect-[2.5/3.5] items-center justify-center rounded-lg">
                                    <span className="text-muted-foreground">Kein Bild</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Printing Details */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Printing Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <span className="text-muted-foreground text-sm">Set</span>
                                    <p className="font-medium">
                                        {printing.set_name ?? printing.set_code}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground text-sm">Collector Number</span>
                                    <p className="font-medium">#{printing.collector_number}</p>
                                </div>
                                {printing.rarity && (
                                    <div>
                                        <span className="text-muted-foreground text-sm">Seltenheit</span>
                                        <p className="font-medium">
                                            {printing.rarity_label ?? rarities[printing.rarity] ?? printing.rarity}
                                        </p>
                                    </div>
                                )}
                                {printing.finish && (
                                    <div>
                                        <span className="text-muted-foreground text-sm">Finish</span>
                                        <p className="font-medium">
                                            {printing.finish_label ?? foilings[printing.finish] ?? printing.finish}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-muted-foreground text-sm">Sprache</span>
                                    <p className="font-medium">{printing.language}</p>
                                </div>
                                {printing.artist && (
                                    <div>
                                        <span className="text-muted-foreground text-sm">Artist</span>
                                        <p className="font-medium">{printing.artist}</p>
                                    </div>
                                )}
                                {printing.released_at && (
                                    <div>
                                        <span className="text-muted-foreground text-sm">Release</span>
                                        <p className="font-medium">
                                            {new Date(printing.released_at).toLocaleDateString('de-DE')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {printing.flavor_text && (
                                <div>
                                    <span className="text-muted-foreground text-sm">Flavor Text</span>
                                    <p className="mt-1 italic text-muted-foreground">
                                        {printing.flavor_text}
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {printing.is_promo && <Badge variant="secondary">Promo</Badge>}
                                {printing.is_reprint && <Badge variant="outline">Reprint</Badge>}
                                {printing.is_variant && <Badge variant="outline">Variant</Badge>}
                            </div>

                            {/* Link to card */}
                            {card && (
                                <div className="pt-4 border-t">
                                    <Link href={`${baseUrl}/cards/${card.id}`}>
                                        <Button variant="outline">
                                            Zur Karte &rarr;
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Other Printings */}
                {allPrintings.length > 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Andere Printings ({allPrintings.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {allPrintings.map((p) => (
                                    <Link
                                        key={p.id}
                                        href={`${baseUrl}/printings/${p.id}`}
                                        className={`group flex gap-3 rounded-lg border p-3 transition-colors hover:bg-accent ${
                                            p.id === printing.id ? 'bg-accent border-primary' : ''
                                        }`}
                                    >
                                        {p.image_url && (
                                            <img
                                                src={p.image_url}
                                                alt={card?.name}
                                                className="h-16 w-auto rounded"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium truncate">
                                                {p.set_name ?? p.set_code}
                                            </p>
                                            <p className="text-muted-foreground text-sm">
                                                #{p.collector_number}
                                            </p>
                                            <div className="mt-1 flex gap-1">
                                                {p.rarity_label && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {p.rarity_label}
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
