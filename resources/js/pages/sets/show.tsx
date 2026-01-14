import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type Game,
    type PaginatedData,
    type UnifiedPrinting,
    type UnifiedSet,
} from '@/types/unified';
import { Head, Link, router } from '@inertiajs/react';
import { Library } from 'lucide-react';

interface Props {
    game: Game;
    set: UnifiedSet & { printings_count: number };
    printings: PaginatedData<UnifiedPrinting>;
}

export default function SetShow({ game, set, printings }: Props) {
    const baseUrl = `/g/${game.slug}`;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `${baseUrl}/cards` },
        { title: 'Sets', href: `${baseUrl}/sets` },
        { title: set.name, href: `${baseUrl}/sets/${set.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${set.name} - ${game.name}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center gap-4">
                    <Link href={`${baseUrl}/sets`}>
                        <Button variant="outline" size="sm">
                            &larr; Zurück
                        </Button>
                    </Link>
                </div>

                {/* Set Info */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            {set.icon_url ? (
                                <img
                                    src={set.icon_url}
                                    alt={set.name}
                                    className="h-12 w-12 object-contain"
                                />
                            ) : (
                                <Library className="h-12 w-12 text-muted-foreground" />
                            )}
                            <div>
                                <CardTitle className="text-2xl">{set.name}</CardTitle>
                                <p className="text-muted-foreground">
                                    [{set.code}] - {set.printings_count} Karten
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {set.set_type && (
                                <div>
                                    <span className="text-muted-foreground text-sm">Typ</span>
                                    <p className="font-medium capitalize">{set.set_type}</p>
                                </div>
                            )}
                            {set.released_at && (
                                <div>
                                    <span className="text-muted-foreground text-sm">Release</span>
                                    <p className="font-medium">
                                        {new Date(set.released_at).toLocaleDateString('de-DE')}
                                    </p>
                                </div>
                            )}
                            {set.card_count && (
                                <div>
                                    <span className="text-muted-foreground text-sm">Kartenzahl (offiziell)</span>
                                    <p className="font-medium">{set.card_count}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Printings */}
                <div>
                    <h2 className="text-xl font-bold mb-4">Karten in diesem Set</h2>

                    {printings.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
                            <Library className="h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-2 text-muted-foreground">Keine Karten in diesem Set</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {printings.data.map((printing) => (
                                <Link
                                    key={printing.id}
                                    href={`${baseUrl}/printings/${printing.id}`}
                                    className="group flex gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                                >
                                    {printing.image_url ? (
                                        <img
                                            src={printing.image_url}
                                            alt={printing.card?.name}
                                            className="h-20 w-auto rounded"
                                        />
                                    ) : (
                                        <div className="h-20 w-14 bg-muted rounded flex items-center justify-center">
                                            <span className="text-xs text-muted-foreground">?</span>
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">
                                            {printing.card?.name}
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
                        <div className="flex items-center justify-center gap-2 mt-6">
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
            </div>
        </AppLayout>
    );
}
