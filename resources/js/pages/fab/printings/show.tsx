import { Badge } from '@/components/ui/badge';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type FabPrinting,
    getRarityLabel,
    getFoilingLabel,
    getLanguageLabel,
    getEditionLabel,
} from '@/types/fab';
import { Head, Link } from '@inertiajs/react';

interface Props {
    printing: FabPrinting;
    allPrintings: FabPrinting[];
    rarities: Record<string, string>;
    foilings: Record<string, string>;
    editions: Record<string, string>;
    languages: Record<string, string>;
}

export default function FabPrintingShow({ printing, allPrintings }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Flesh and Blood',
            href: '/fab/cards',
        },
        {
            title: 'Drucke',
            href: '/fab/printings',
        },
        {
            title: printing.collector_number,
            href: `/fab/printings/${printing.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${printing.card?.name} - ${printing.collector_number}`} />

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
                                <Link href={`/fab/cards/${printing.card?.id}`} className="hover:underline">
                                    {printing.card?.name}
                                </Link>
                            </h1>
                            <p className="text-muted-foreground">
                                {printing.set?.name} - {printing.collector_number}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {printing.rarity && (
                                <Badge variant="secondary">
                                    {printing.rarity} - {getRarityLabel(printing.rarity)}
                                </Badge>
                            )}
                            {printing.foiling && <Badge>{getFoilingLabel(printing.foiling)}</Badge>}
                            {printing.edition && (
                                <Badge variant="outline">{getEditionLabel(printing.edition)}</Badge>
                            )}
                            <Badge variant="outline">{getLanguageLabel(printing.language)}</Badge>
                        </div>

                        <CardUI>
                            <CardHeader>
                                <CardTitle>Druckdetails</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    <div>
                                        <dt className="text-muted-foreground text-sm">Set</dt>
                                        <dd className="font-medium">{printing.set?.name}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground text-sm">Nummer</dt>
                                        <dd className="font-medium">{printing.collector_number}</dd>
                                    </div>
                                    {printing.rarity && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Seltenheit</dt>
                                            <dd className="font-medium">
                                                {printing.rarity} - {getRarityLabel(printing.rarity)}
                                            </dd>
                                        </div>
                                    )}
                                    {printing.foiling && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Foiling</dt>
                                            <dd className="font-medium">{getFoilingLabel(printing.foiling)}</dd>
                                        </div>
                                    )}
                                    {printing.edition && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Edition</dt>
                                            <dd className="font-medium">{getEditionLabel(printing.edition)}</dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-muted-foreground text-sm">Sprache</dt>
                                        <dd className="font-medium">{getLanguageLabel(printing.language)}</dd>
                                    </div>
                                    {printing.artists && printing.artists.length > 0 && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Künstler</dt>
                                            <dd className="font-medium">{printing.artists.join(', ')}</dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </CardUI>

                        {printing.tcgplayer_url && (
                            <a
                                href={printing.tcgplayer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                Auf TCGPlayer ansehen
                            </a>
                        )}
                    </div>
                </div>

                {/* All Printings of this Card */}
                {allPrintings.length > 1 && (
                    <CardUI>
                        <CardHeader>
                            <CardTitle>Alle Drucke dieser Karte ({allPrintings.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Set</TableHead>
                                        <TableHead>Nummer</TableHead>
                                        <TableHead>Seltenheit</TableHead>
                                        <TableHead>Foiling</TableHead>
                                        <TableHead>Edition</TableHead>
                                        <TableHead>Sprache</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allPrintings.map((p) => (
                                        <TableRow
                                            key={p.id}
                                            className={`cursor-pointer ${
                                                p.id === printing.id
                                                    ? 'bg-accent font-medium'
                                                    : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <TableCell>
                                                {p.id === printing.id ? (
                                                    <span className="font-medium">
                                                        {p.set?.name ?? p.set?.external_id}
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href={`/fab/printings/${p.id}`}
                                                        className="hover:underline"
                                                    >
                                                        {p.set?.name ?? p.set?.external_id}
                                                    </Link>
                                                )}
                                            </TableCell>
                                            <TableCell>{p.collector_number}</TableCell>
                                            <TableCell>
                                                {p.rarity && (
                                                    <Badge variant="outline">
                                                        {p.rarity} - {getRarityLabel(p.rarity)}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{getFoilingLabel(p.foiling)}</TableCell>
                                            <TableCell>{getEditionLabel(p.edition)}</TableCell>
                                            <TableCell>{getLanguageLabel(p.language)}</TableCell>
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
