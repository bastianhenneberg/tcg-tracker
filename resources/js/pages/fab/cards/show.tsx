import { Badge } from '@/components/ui/badge';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type FabCard,
    type FabPrinting,
    getRarityLabel,
    getFoilingLabel,
    getLanguageLabel,
    getEditionLabel,
    getPitchColor,
} from '@/types/fab';
import { Head, Link } from '@inertiajs/react';

interface LinkedCustomCard {
    id: number;
    name: string;
    printings: {
        id: number;
        set_name: string;
        collector_number: string;
        rarity: string | null;
        foiling: string | null;
        language: string | null;
    }[];
}

interface Props {
    card: FabCard;
    linkedCustomCards: LinkedCustomCard[];
    rarities: Record<string, string>;
    foilings: Record<string, string>;
    editions: Record<string, string>;
    languages: Record<string, string>;
}

export default function FabCardShow({ card, linkedCustomCards }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Flesh and Blood',
            href: '/fab/cards',
        },
        {
            title: 'Kartendatenbank',
            href: '/fab/cards',
        },
        {
            title: card.name,
            href: `/fab/cards/${card.id}`,
        },
    ];

    const pitchColor = getPitchColor(card.pitch);

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
                                {pitchColor === 'red' && (
                                    <span className="inline-block h-5 w-5 rounded-full bg-red-500" />
                                )}
                                {pitchColor === 'yellow' && (
                                    <span className="inline-block h-5 w-5 rounded-full bg-yellow-500" />
                                )}
                                {pitchColor === 'blue' && (
                                    <span className="inline-block h-5 w-5 rounded-full bg-blue-500" />
                                )}
                            </div>
                            <p className="text-muted-foreground">{card.type_text}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {card.types?.map((type) => (
                                <Badge key={type} variant="secondary">
                                    {type}
                                </Badge>
                            ))}
                            {card.traits?.map((trait) => (
                                <Badge key={trait} variant="outline">
                                    {trait}
                                </Badge>
                            ))}
                        </div>

                        <CardUI>
                            <CardHeader>
                                <CardTitle>Kartendetails</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    {card.pitch !== null && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Pitch</dt>
                                            <dd className="font-medium">{card.pitch}</dd>
                                        </div>
                                    )}
                                    {card.cost && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Cost</dt>
                                            <dd className="font-medium">{card.cost}</dd>
                                        </div>
                                    )}
                                    {card.power && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Power</dt>
                                            <dd className="font-medium">{card.power}</dd>
                                        </div>
                                    )}
                                    {card.defense && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Defense</dt>
                                            <dd className="font-medium">{card.defense}</dd>
                                        </div>
                                    )}
                                    {card.health !== null && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Health</dt>
                                            <dd className="font-medium">{card.health}</dd>
                                        </div>
                                    )}
                                    {card.intelligence !== null && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Intelligence</dt>
                                            <dd className="font-medium">{card.intelligence}</dd>
                                        </div>
                                    )}
                                    {card.arcane !== null && (
                                        <div>
                                            <dt className="text-muted-foreground text-sm">Arcane</dt>
                                            <dd className="font-medium">{card.arcane}</dd>
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
                                    <p className="whitespace-pre-wrap">{card.functional_text_plain ?? card.functional_text}</p>
                                </CardContent>
                            </CardUI>
                        )}

                        {card.card_keywords && card.card_keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <span className="text-muted-foreground text-sm">Keywords:</span>
                                {card.card_keywords.map((keyword) => (
                                    <Badge key={keyword}>{keyword}</Badge>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {card.blitz_legal && <Badge variant="outline">Blitz Legal</Badge>}
                            {card.cc_legal && <Badge variant="outline">CC Legal</Badge>}
                            {card.commoner_legal && <Badge variant="outline">Commoner Legal</Badge>}
                            {card.ll_legal && <Badge variant="outline">Living Legend</Badge>}
                        </div>
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
                                        <TableHead>Edition</TableHead>
                                        <TableHead>Sprache</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {card.printings.map((printing: FabPrinting) => (
                                        <TableRow key={printing.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell>
                                                <Link
                                                    href={`/fab/printings/${printing.id}`}
                                                    className="hover:underline"
                                                >
                                                    {printing.set?.name ?? printing.set?.external_id}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{printing.collector_number}</TableCell>
                                            <TableCell>
                                                {printing.rarity && (
                                                    <Badge variant="outline">
                                                        {printing.rarity} - {getRarityLabel(printing.rarity)}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{getFoilingLabel(printing.foiling)}</TableCell>
                                            <TableCell>{getEditionLabel(printing.edition)}</TableCell>
                                            <TableCell>{getLanguageLabel(printing.language)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </CardUI>
                )}

                {/* Linked Custom Cards (Translations/Variants) */}
                {linkedCustomCards && linkedCustomCards.length > 0 && (
                    <CardUI>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span>Eigene Varianten</span>
                                <Badge variant="secondary" className="font-normal">Custom</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {linkedCustomCards.map((customCard) => (
                                    <div key={customCard.id} className="space-y-2">
                                        <h4 className="font-medium text-sm flex items-center gap-2">
                                            {customCard.name}
                                            <Badge variant="outline" className="text-xs">Verknüpft</Badge>
                                        </h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Set</TableHead>
                                                    <TableHead>Nummer</TableHead>
                                                    <TableHead>Seltenheit</TableHead>
                                                    <TableHead>Foiling</TableHead>
                                                    <TableHead>Sprache</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {customCard.printings.map((printing) => (
                                                    <TableRow key={printing.id} className="bg-muted/30">
                                                        <TableCell>{printing.set_name}</TableCell>
                                                        <TableCell>{printing.collector_number}</TableCell>
                                                        <TableCell>
                                                            {printing.rarity && (
                                                                <Badge variant="outline">
                                                                    {printing.rarity} - {getRarityLabel(printing.rarity)}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{getFoilingLabel(printing.foiling)}</TableCell>
                                                        <TableCell>{getLanguageLabel(printing.language)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </CardUI>
                )}
            </div>
        </AppLayout>
    );
}
