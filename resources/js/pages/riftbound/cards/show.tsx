import { Badge } from '@/components/ui/badge';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type RiftboundCard,
    type RiftboundPrinting,
    getRiftboundRarityLabel,
    getRiftboundFoilingLabel,
    getDomainColor,
} from '@/types/riftbound';
import { Head, Link } from '@inertiajs/react';

interface Props {
    card: RiftboundCard;
    rarities: Record<string, string>;
    foilings: Record<string, string>;
}

export default function RiftboundCardShow({ card }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Riftbound',
            href: '/riftbound/cards',
        },
        {
            title: 'Kartendatenbank',
            href: '/riftbound/cards',
        },
        {
            title: card.name,
            href: `/riftbound/cards/${card.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={card.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Card Image */}
                    <div className="shrink-0">
                        {card.printings?.[0]?.image_url ? (
                            <img
                                src={card.printings[0].image_url}
                                alt={card.name}
                                className="w-full max-w-xs rounded-lg shadow-lg"
                            />
                        ) : (
                            <div className="bg-muted flex h-96 w-64 items-center justify-center rounded-lg">
                                <span className="text-muted-foreground">Kein Bild</span>
                            </div>
                        )}
                    </div>

                    {/* Card Details */}
                    <div className="flex-1 space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold">{card.name}</h1>
                            <p className="text-muted-foreground">{card.types?.join(' - ')}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {card.types?.map((type) => (
                                <Badge key={type} variant="secondary">
                                    {type}
                                </Badge>
                            ))}
                            {card.domains?.map((domain) => (
                                <Badge key={domain} variant="outline" className={getDomainColor(domain)}>
                                    {domain}
                                </Badge>
                            ))}
                        </div>

                        <CardUI>
                            <CardHeader>
                                <CardTitle>Kartendetails</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    {card.energy !== null && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Energy</dt>
                                            <dd className="font-medium">{card.energy}</dd>
                                        </div>
                                    )}
                                    {card.power !== null && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Power</dt>
                                            <dd className="font-medium">{card.power}</dd>
                                        </div>
                                    )}
                                    {card.illustrators && card.illustrators.length > 0 && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Illustrator</dt>
                                            <dd className="font-medium">{card.illustrators.join(', ')}</dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </CardUI>

                        {card.functional_text && (
                            <CardUI>
                                <CardHeader>
                                    <CardTitle>Kartentext</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-wrap">{card.functional_text}</p>
                                </CardContent>
                            </CardUI>
                        )}
                    </div>
                </div>

                {/* Printings */}
                {card.printings && card.printings.length > 0 && (
                    <CardUI>
                        <CardHeader>
                            <CardTitle>Drucke ({card.printings.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Set</TableHead>
                                        <TableHead>Nummer</TableHead>
                                        <TableHead>Seltenheit</TableHead>
                                        <TableHead>Foiling</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {card.printings.map((printing: RiftboundPrinting) => (
                                        <TableRow key={printing.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell>
                                                <Link
                                                    href={`/riftbound/printings/${printing.id}`}
                                                    className="hover:underline"
                                                >
                                                    {printing.set?.name ?? printing.set?.code}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{printing.collector_number}</TableCell>
                                            <TableCell>
                                                {printing.rarity && (
                                                    <Badge variant="outline">
                                                        {printing.rarity} - {getRiftboundRarityLabel(printing.rarity)}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{getRiftboundFoilingLabel(printing.foiling)}</TableCell>
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
