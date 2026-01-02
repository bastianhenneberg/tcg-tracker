import { Badge } from '@/components/ui/badge';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type MtgCard,
    type MtgPrinting,
    getRarityLabel,
} from '@/types/mtg';
import { Head, Link } from '@inertiajs/react';

interface Props {
    card: MtgCard;
    rarities: Record<string, string>;
    finishes: Record<string, string>;
}

export default function MtgCardShow({ card, rarities, finishes }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Magic: The Gathering',
            href: '/mtg/cards',
        },
        {
            title: 'Kartendatenbank',
            href: '/mtg/cards',
        },
        {
            title: card.name,
            href: `/mtg/cards/${card.id}`,
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
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold">{card.name}</h1>
                                {card.mana_cost && (
                                    <span className="text-lg text-muted-foreground">{card.mana_cost}</span>
                                )}
                            </div>
                            <p className="text-muted-foreground">{card.type_line}</p>
                        </div>

                        {/* Color Identity */}
                        {card.colors && card.colors.length > 0 && (
                            <div className="flex gap-2">
                                {card.colors.map((color) => (
                                    <span
                                        key={color}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                                        style={{
                                            backgroundColor:
                                                color === 'W' ? '#F9FAF4' :
                                                color === 'U' ? '#0E68AB' :
                                                color === 'B' ? '#150B00' :
                                                color === 'R' ? '#D3202A' :
                                                color === 'G' ? '#00733E' : '#ccc',
                                            color: color === 'W' ? '#000' : '#fff',
                                            border: color === 'W' ? '1px solid #ccc' : 'none',
                                        }}
                                    >
                                        {color}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {card.types?.map((type) => (
                                <Badge key={type} variant="secondary">
                                    {type}
                                </Badge>
                            ))}
                            {card.subtypes?.map((subtype) => (
                                <Badge key={subtype} variant="outline">
                                    {subtype}
                                </Badge>
                            ))}
                            {card.supertypes?.map((supertype) => (
                                <Badge key={supertype}>
                                    {supertype}
                                </Badge>
                            ))}
                        </div>

                        <CardUI>
                            <CardHeader>
                                <CardTitle>Kartendetails</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    {card.mana_value !== null && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Mana Value</dt>
                                            <dd className="font-medium">{card.mana_value}</dd>
                                        </div>
                                    )}
                                    {card.power && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Power</dt>
                                            <dd className="font-medium">{card.power}</dd>
                                        </div>
                                    )}
                                    {card.toughness && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Toughness</dt>
                                            <dd className="font-medium">{card.toughness}</dd>
                                        </div>
                                    )}
                                    {card.loyalty && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Loyalty</dt>
                                            <dd className="font-medium">{card.loyalty}</dd>
                                        </div>
                                    )}
                                    {card.defense && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Defense</dt>
                                            <dd className="font-medium">{card.defense}</dd>
                                        </div>
                                    )}
                                    {card.edhrec_rank && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">EDHREC Rank</dt>
                                            <dd className="font-medium">#{card.edhrec_rank}</dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </CardUI>

                        {card.oracle_text && (
                            <CardUI>
                                <CardHeader>
                                    <CardTitle>Kartentext</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-wrap">{card.oracle_text}</p>
                                </CardContent>
                            </CardUI>
                        )}

                        {card.keywords && card.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <span className="text-muted-foreground text-sm">Keywords:</span>
                                {card.keywords.map((keyword) => (
                                    <Badge key={keyword}>{keyword}</Badge>
                                ))}
                            </div>
                        )}

                        {/* Legalities */}
                        {card.legalities && (
                            <CardUI>
                                <CardHeader>
                                    <CardTitle>Legalitäten</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(card.legalities).map(([format, status]) => (
                                            <Badge
                                                key={format}
                                                variant={status === 'Legal' ? 'default' : status === 'Restricted' ? 'secondary' : 'outline'}
                                                className={status === 'Banned' ? 'line-through opacity-50' : ''}
                                            >
                                                {format}: {status}
                                            </Badge>
                                        ))}
                                    </div>
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
                                        <TableHead>Artist</TableHead>
                                        <TableHead>Finishes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {card.printings.map((printing: MtgPrinting) => (
                                        <TableRow key={printing.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell>
                                                <Link
                                                    href={`/mtg/printings/${printing.id}`}
                                                    className="hover:underline"
                                                >
                                                    {printing.set?.name ?? printing.set?.code}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{printing.number}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {getRarityLabel(printing.rarity)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{printing.artist ?? '-'}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {printing.has_non_foil && <Badge variant="secondary">Non-Foil</Badge>}
                                                    {printing.has_foil && <Badge variant="secondary">Foil</Badge>}
                                                </div>
                                            </TableCell>
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
