import { Badge } from '@/components/ui/badge';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type MtgPrinting,
    getRarityLabel,
} from '@/types/mtg';
import { Head, Link } from '@inertiajs/react';

interface Props {
    printing: MtgPrinting;
    allPrintings: MtgPrinting[];
    rarities: Record<string, string>;
    finishes: Record<string, string>;
}

export default function MtgPrintingShow({ printing, allPrintings, rarities, finishes }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Magic: The Gathering',
            href: '/mtg/cards',
        },
        {
            title: 'Printings',
            href: '/mtg/printings',
        },
        {
            title: `${printing.card?.name} (${printing.set?.code} #${printing.number})`,
            href: `/mtg/printings/${printing.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${printing.card?.name} - ${printing.set?.name}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Card Image */}
                    <div className="shrink-0">
                        {printing.image_url ? (
                            <img
                                src={printing.image_url}
                                alt={printing.card?.name ?? ''}
                                className="w-full max-w-xs rounded-lg shadow-lg"
                            />
                        ) : (
                            <div className="bg-muted flex h-96 w-64 items-center justify-center rounded-lg">
                                <span className="text-muted-foreground">Kein Bild</span>
                            </div>
                        )}
                    </div>

                    {/* Printing Details */}
                    <div className="flex-1 space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold">
                                <Link href={`/mtg/cards/${printing.card?.id}`} className="hover:underline">
                                    {printing.card?.name}
                                </Link>
                            </h1>
                            <p className="text-muted-foreground">
                                {printing.set?.name} ({printing.set?.code}) #{printing.number}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">
                                {getRarityLabel(printing.rarity)}
                            </Badge>
                            {printing.has_non_foil && <Badge variant="outline">Non-Foil</Badge>}
                            {printing.has_foil && <Badge variant="outline">Foil</Badge>}
                            {printing.is_promo && <Badge>Promo</Badge>}
                            {printing.is_full_art && <Badge>Full Art</Badge>}
                            {printing.is_textless && <Badge>Textless</Badge>}
                        </div>

                        <CardUI>
                            <CardHeader>
                                <CardTitle>Printing Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    <div>
                                        <dt className="text-muted-foreground text-sm">Collector Number</dt>
                                        <dd className="font-medium">{printing.number}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground text-sm">Rarity</dt>
                                        <dd className="font-medium">{getRarityLabel(printing.rarity)}</dd>
                                    </div>
                                    {printing.artist && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Artist</dt>
                                            <dd className="font-medium">{printing.artist}</dd>
                                        </div>
                                    )}
                                    {printing.border_color && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Border</dt>
                                            <dd className="font-medium capitalize">{printing.border_color}</dd>
                                        </div>
                                    )}
                                    {printing.frame_version && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Frame</dt>
                                            <dd className="font-medium">{printing.frame_version}</dd>
                                        </div>
                                    )}
                                    {printing.watermark && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Watermark</dt>
                                            <dd className="font-medium capitalize">{printing.watermark}</dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </CardUI>

                        {printing.flavor_text && (
                            <CardUI>
                                <CardHeader>
                                    <CardTitle>Flavor Text</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-wrap italic">{printing.flavor_text}</p>
                                </CardContent>
                            </CardUI>
                        )}

                        <CardUI>
                            <CardHeader>
                                <CardTitle>External IDs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    {printing.scryfall_id && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Scryfall</dt>
                                            <dd className="font-mono text-xs">{printing.scryfall_id}</dd>
                                        </div>
                                    )}
                                    {printing.multiverse_id && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Multiverse ID</dt>
                                            <dd className="font-medium">{printing.multiverse_id}</dd>
                                        </div>
                                    )}
                                    {printing.tcgplayer_product_id && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">TCGplayer</dt>
                                            <dd className="font-medium">{printing.tcgplayer_product_id}</dd>
                                        </div>
                                    )}
                                    {printing.cardmarket_id && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Cardmarket</dt>
                                            <dd className="font-medium">{printing.cardmarket_id}</dd>
                                        </div>
                                    )}
                                    {printing.mtgo_id && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">MTGO</dt>
                                            <dd className="font-medium">{printing.mtgo_id}</dd>
                                        </div>
                                    )}
                                    {printing.arena_id && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Arena</dt>
                                            <dd className="font-medium">{printing.arena_id}</dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </CardUI>
                    </div>
                </div>

                {/* Other Printings of this Card */}
                {allPrintings && allPrintings.length > 1 && (
                    <CardUI>
                        <CardHeader>
                            <CardTitle>Andere Drucke dieser Karte ({allPrintings.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Set</TableHead>
                                        <TableHead>Nummer</TableHead>
                                        <TableHead>Seltenheit</TableHead>
                                        <TableHead>Artist</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allPrintings.map((p) => (
                                        <TableRow
                                            key={p.id}
                                            className={`cursor-pointer hover:bg-muted/50 ${p.id === printing.id ? 'bg-muted/30' : ''}`}
                                        >
                                            <TableCell>
                                                <Link
                                                    href={`/mtg/printings/${p.id}`}
                                                    className="hover:underline"
                                                >
                                                    {p.set?.name ?? p.set?.code}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{p.number}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {getRarityLabel(p.rarity)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{p.artist ?? '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </CardUI>
                )}
            </div>
        </AppLayout>
    );
}
