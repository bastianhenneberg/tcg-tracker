import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type OpPrinting,
    getRarityLabel,
    getLanguageLabel,
    getColorClass,
    ATTRIBUTES,
} from '@/types/op';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface Props {
    printing: OpPrinting;
}

export default function OpPrintingShow({ printing }: Props) {
    const card = printing.card;
    const set = printing.set;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'One Piece',
            href: '/onepiece/cards',
        },
        {
            title: 'Drucke',
            href: '/onepiece/printings',
        },
        {
            title: printing.external_id,
            href: `/onepiece/printings/${printing.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${printing.external_id} - One Piece`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.visit('/onepiece/printings')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-bold">{card?.name ?? printing.external_id}</h1>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Card Image */}
                    <Card>
                        <CardContent className="p-4">
                            {printing.image_url ? (
                                <img
                                    src={printing.image_url}
                                    alt={card?.name ?? ''}
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
                                {card?.name}
                                {card?.color && (
                                    <span
                                        className={`inline-block h-4 w-4 rounded-full ${getColorClass(card.color)}`}
                                        title={card.color}
                                    />
                                )}
                                {card?.color_secondary && (
                                    <span
                                        className={`inline-block h-4 w-4 rounded-full ${getColorClass(card.color_secondary)}`}
                                        title={card.color_secondary}
                                    />
                                )}
                            </CardTitle>
                            <CardDescription>
                                {set?.name} - {printing.collector_number}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Printing Info */}
                            <div className="flex flex-wrap gap-2">
                                <Badge>{card?.card_type}</Badge>
                                <Badge variant="outline">{getRarityLabel(printing.rarity)}</Badge>
                                <Badge variant="secondary">{getLanguageLabel(printing.language)}</Badge>
                                {printing.is_alternate_art && <Badge>Alt Art</Badge>}
                            </div>

                            {/* Stats */}
                            {card && (
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
                            )}

                            {/* Types */}
                            {card?.types && card.types.length > 0 && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Typen</div>
                                    <p>{card.types.join(' / ')}</p>
                                </div>
                            )}

                            {/* Attribute */}
                            {card?.attribute && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Attribut</div>
                                    <Badge variant="outline">
                                        {ATTRIBUTES[card.attribute as keyof typeof ATTRIBUTES] ?? card.attribute}
                                    </Badge>
                                </div>
                            )}

                            {/* Effect */}
                            {card?.effect && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Effekt</div>
                                    <p className="whitespace-pre-wrap">{card.effect}</p>
                                </div>
                            )}

                            {/* Trigger */}
                            {card?.trigger && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Trigger</div>
                                    <p className="whitespace-pre-wrap">{card.trigger}</p>
                                </div>
                            )}

                            {/* View Card */}
                            {card && (
                                <Button
                                    variant="outline"
                                    onClick={() => router.visit(`/onepiece/cards/${card.id}`)}
                                >
                                    Alle Drucke dieser Karte anzeigen
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
