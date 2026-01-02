import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type OpCard,
    type OpPrinting,
    getRarityLabel,
    getLanguageLabel,
    getColorClass,
    ATTRIBUTES,
} from '@/types/op';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Eye } from 'lucide-react';

interface Props {
    card: OpCard & { printings: OpPrinting[] };
}

export default function OpCardShow({ card }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'One Piece',
            href: '/onepiece/cards',
        },
        {
            title: 'Kartendatenbank',
            href: '/onepiece/cards',
        },
        {
            title: card.name,
            href: `/onepiece/cards/${card.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${card.name} - One Piece`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.visit('/onepiece/cards')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-bold">{card.name}</h1>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Card Image */}
                    <Card>
                        <CardContent className="p-4">
                            {card.printings[0]?.image_url ? (
                                <img
                                    src={card.printings[0].image_url}
                                    alt={card.name}
                                    className="w-full rounded-lg"
                                />
                            ) : (
                                <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-muted">
                                    <span className="text-muted-foreground">Kein Bild</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Card Details */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {card.name}
                                <span
                                    className={`inline-block h-4 w-4 rounded-full ${getColorClass(card.color)}`}
                                    title={card.color}
                                />
                                {card.color_secondary && (
                                    <span
                                        className={`inline-block h-4 w-4 rounded-full ${getColorClass(card.color_secondary)}`}
                                        title={card.color_secondary}
                                    />
                                )}
                            </CardTitle>
                            <CardDescription>
                                {card.card_type}
                                {card.types && card.types.length > 0 && ` - ${card.types.join(' / ')}`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                {card.cost !== null && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">Cost</div>
                                        <div className="text-lg font-bold">{card.cost}</div>
                                    </div>
                                )}
                                {card.power !== null && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">Power</div>
                                        <div className="text-lg font-bold">{card.power}</div>
                                    </div>
                                )}
                                {card.life !== null && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">Life</div>
                                        <div className="text-lg font-bold">{card.life}</div>
                                    </div>
                                )}
                                {card.counter !== null && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">Counter</div>
                                        <div className="text-lg font-bold">+{card.counter}</div>
                                    </div>
                                )}
                            </div>

                            {card.attribute && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Attribut</div>
                                    <Badge variant="outline">
                                        {ATTRIBUTES[card.attribute as keyof typeof ATTRIBUTES] ?? card.attribute}
                                    </Badge>
                                </div>
                            )}

                            {card.effect && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Effekt</div>
                                    <p className="whitespace-pre-wrap">{card.effect}</p>
                                </div>
                            )}

                            {card.trigger && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Trigger</div>
                                    <p className="whitespace-pre-wrap">{card.trigger}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Printings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Drucke ({card.printings.length})</CardTitle>
                        <CardDescription>Alle verfuegbaren Versionen dieser Karte</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Set</TableHead>
                                    <TableHead>Nummer</TableHead>
                                    <TableHead>Seltenheit</TableHead>
                                    <TableHead>Sprache</TableHead>
                                    <TableHead>Alt Art</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {card.printings.map((printing) => (
                                    <TableRow key={printing.id}>
                                        <TableCell>{printing.set?.name ?? '-'}</TableCell>
                                        <TableCell>{printing.collector_number}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {getRarityLabel(printing.rarity)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getLanguageLabel(printing.language)}</TableCell>
                                        <TableCell>
                                            {printing.is_alternate_art ? (
                                                <Badge>Alt Art</Badge>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => router.visit(`/onepiece/printings/${printing.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
