import { CardThumbnail } from '@/components/deck/card-thumbnail';
import { HoverCardPreview } from '@/components/deck/hover-card-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    DeckCard,
    DeckStatistics,
    DeckValidation,
    DeckZoneWithCards,
    GameFormat,
} from '@/types/deck';
import { Game, UnifiedPrinting } from '@/types/unified';
import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle,
    Download,
    Edit,
    Grid3X3,
    List,
} from 'lucide-react';
import { useState } from 'react';

interface Deck {
    id: number;
    user_id: number;
    game_format_id: number;
    name: string;
    description?: string;
    is_public: boolean;
    use_collection_only: boolean;
    game_format?: GameFormat;
    created_at: string;
    updated_at: string;
}

interface Props {
    game: Game;
    deck: Deck;
    zones: DeckZoneWithCards[];
    validation: DeckValidation;
    statistics: DeckStatistics;
}

export default function DecksShow({
    game,
    deck,
    zones,
    validation,
    statistics,
}: Props) {
    const [viewMode, setViewMode] = useState<'visual' | 'list'>('visual');
    const [previewCard, setPreviewCard] = useState<UnifiedPrinting | null>(
        null,
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/g/${game.slug}/inventory` },
        { title: 'Decks', href: `/g/${game.slug}/decks` },
        { title: deck.name, href: `/g/${game.slug}/decks/${deck.id}` },
    ];

    // Find hero zone (max_cards === 1 and is_required)
    const heroZone = zones.find(
        (z) => z.zone.max_cards === 1 && z.zone.is_required,
    );
    const heroCard = heroZone?.cards[0];

    // Separate counting zones from non-counting zones (like Maybe)
    const countingZones = zones.filter(
        (z) => z.zone.counts_towards_deck && z.zone.slug !== 'hero',
    );
    const nonCountingZones = zones.filter((z) => !z.zone.counts_towards_deck);

    // Get pitch color for FAB cards (using ring instead of border to not add width)
    const getPitchColor = (card: DeckCard) => {
        const pitch = card.printing?.card?.game_specific?.pitch;
        if (pitch === 1) return 'ring-2 ring-destructive';
        if (pitch === 2) return 'ring-2 ring-warning';
        if (pitch === 3) return 'ring-2 ring-info';
        return '';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${deck.name} - ${game.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                        {/* Hero Card Preview */}
                        {heroCard?.printing?.image_url && (
                            <div
                                className="hidden shrink-0 cursor-pointer sm:block"
                                onClick={() =>
                                    heroCard.printing &&
                                    setPreviewCard(heroCard.printing)
                                }
                            >
                                <img
                                    src={heroCard.printing.image_url}
                                    alt={heroCard.printing.card?.name}
                                    className="h-32 w-auto rounded-lg shadow-lg ring-2 ring-primary/20 transition-all hover:ring-primary/50"
                                />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold">{deck.name}</h1>
                            <p className="text-muted-foreground">
                                {deck.game_format?.name}
                                {heroCard?.printing?.card?.name &&
                                    ` • ${heroCard.printing.card.name}`}
                            </p>
                            {deck.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {deck.description}
                                </p>
                            )}
                            <div className="mt-2 flex gap-2">
                                {deck.is_public && (
                                    <Badge
                                        variant="secondary"
                                        className="text-success"
                                    >
                                        Öffentlich
                                    </Badge>
                                )}
                                {deck.use_collection_only && (
                                    <Badge
                                        variant="secondary"
                                        className="text-info"
                                    >
                                        Nur Sammlung
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <a
                            href={`/g/${game.slug}/decks/${deck.id}/export/txt`}
                            download
                        >
                            <Button variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </a>
                        <Link href={`/g/${game.slug}/decks/${deck.id}/builder`}>
                            <Button size="sm">
                                <Edit className="mr-2 h-4 w-4" />
                                Bearbeiten
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Validation Status */}
                {!validation.valid && (
                    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                        <div className="flex flex-wrap gap-2">
                            {validation.errors.map((error, i) => (
                                <span
                                    key={i}
                                    className="text-sm text-destructive"
                                >
                                    {error.message}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {validation.valid && (
                    <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-3">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span className="text-sm text-success">
                            Deck ist gültig und spielbereit
                        </span>
                    </div>
                )}

                {/* Main Content */}
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                    {/* Deck Content */}
                    <div className="space-y-4">
                        {/* View Mode Toggle */}
                        <div className="flex items-center justify-between">
                            <Tabs
                                value={viewMode}
                                onValueChange={(v) =>
                                    setViewMode(v as 'visual' | 'list')
                                }
                            >
                                <TabsList>
                                    <TabsTrigger
                                        value="visual"
                                        className="gap-2"
                                    >
                                        <Grid3X3 className="h-4 w-4" />
                                        Visuell
                                    </TabsTrigger>
                                    <TabsTrigger value="list" className="gap-2">
                                        <List className="h-4 w-4" />
                                        Liste
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <span className="text-sm text-muted-foreground">
                                {statistics.total_cards} Karten
                            </span>
                        </div>

                        {/* Visual View */}
                        {viewMode === 'visual' && (
                            <div className="space-y-6">
                                {countingZones.map(({ zone, cards, count }) => {
                                    if (cards.length === 0 && !zone.is_required)
                                        return null;

                                    return (
                                        <div key={zone.id}>
                                            <div className="mb-3 flex items-center justify-between">
                                                <h3 className="flex items-center gap-2 font-semibold">
                                                    {zone.name}
                                                    <span className="text-sm font-normal text-muted-foreground">
                                                        ({count}
                                                        {zone.min_cards > 0 &&
                                                        zone.min_cards ===
                                                            zone.max_cards
                                                            ? `/${zone.min_cards}`
                                                            : zone.max_cards
                                                              ? `/${zone.max_cards}`
                                                              : ''}
                                                        )
                                                    </span>
                                                </h3>
                                            </div>
                                            {cards.length === 0 ? (
                                                <p className="py-4 text-sm text-muted-foreground">
                                                    Keine Karten
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {cards.map((card) => (
                                                        <HoverCardPreview
                                                            key={card.id}
                                                            printing={
                                                                card.printing!
                                                            }
                                                            onClick={() =>
                                                                card.printing &&
                                                                setPreviewCard(
                                                                    card.printing,
                                                                )
                                                            }
                                                            className={`rounded-lg ${getPitchColor(card)}`}
                                                        >
                                                            <CardThumbnail
                                                                printing={
                                                                    card.printing!
                                                                }
                                                                showQuantity={
                                                                    card.quantity
                                                                }
                                                                size="md"
                                                            />
                                                        </HoverCardPreview>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Non-counting zones (Maybe) */}
                                {nonCountingZones.map(
                                    ({ zone, cards, count }) => {
                                        if (cards.length === 0) return null;

                                        return (
                                            <div
                                                key={zone.id}
                                                className="border-t border-dashed pt-4"
                                            >
                                                <div className="mb-3 flex items-center justify-between">
                                                    <h3 className="flex items-center gap-2 font-semibold text-muted-foreground">
                                                        {zone.name}
                                                        <span className="text-sm font-normal">
                                                            ({count})
                                                        </span>
                                                    </h3>
                                                </div>
                                                <div className="flex flex-wrap gap-2 opacity-70">
                                                    {cards.map((card) => (
                                                        <HoverCardPreview
                                                            key={card.id}
                                                            printing={
                                                                card.printing!
                                                            }
                                                            onClick={() =>
                                                                card.printing &&
                                                                setPreviewCard(
                                                                    card.printing,
                                                                )
                                                            }
                                                        >
                                                            <CardThumbnail
                                                                printing={
                                                                    card.printing!
                                                                }
                                                                showQuantity={
                                                                    card.quantity
                                                                }
                                                                size="md"
                                                            />
                                                        </HoverCardPreview>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        )}

                        {/* List View */}
                        {viewMode === 'list' && (
                            <div className="space-y-4">
                                {countingZones.map(({ zone, cards, count }) => {
                                    if (cards.length === 0 && !zone.is_required)
                                        return null;

                                    return (
                                        <Card key={zone.id}>
                                            <CardHeader className="py-3">
                                                <CardTitle className="flex items-center justify-between text-base">
                                                    <span>{zone.name}</span>
                                                    <span className="text-sm font-normal text-muted-foreground">
                                                        {count}
                                                        {zone.min_cards > 0 &&
                                                            `/${zone.min_cards}`}
                                                        {zone.max_cards &&
                                                            zone.min_cards !==
                                                                zone.max_cards &&
                                                            `-${zone.max_cards}`}
                                                    </span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="py-0 pb-3">
                                                {cards.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        Keine Karten
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {cards.map((card) => (
                                                            <HoverCardPreview
                                                                key={card.id}
                                                                printing={
                                                                    card.printing!
                                                                }
                                                                onClick={() =>
                                                                    card.printing &&
                                                                    setPreviewCard(
                                                                        card.printing,
                                                                    )
                                                                }
                                                                className="-mx-2 flex items-center gap-3 rounded px-2 py-1 hover:bg-muted/50"
                                                                showEyeIcon={
                                                                    false
                                                                }
                                                            >
                                                                {card.printing
                                                                    ?.image_url_small && (
                                                                    <img
                                                                        src={
                                                                            card
                                                                                .printing
                                                                                .image_url_small
                                                                        }
                                                                        alt={
                                                                            card
                                                                                .printing
                                                                                .card
                                                                                ?.name
                                                                        }
                                                                        className="h-8 w-auto rounded"
                                                                    />
                                                                )}
                                                                <span className="text-sm font-medium">
                                                                    {
                                                                        card.quantity
                                                                    }
                                                                    x
                                                                </span>
                                                                <span className="flex-1 text-sm">
                                                                    {
                                                                        card
                                                                            .printing
                                                                            ?.card
                                                                            ?.name
                                                                    }
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {
                                                                        card
                                                                            .printing
                                                                            ?.set_code
                                                                    }
                                                                </span>
                                                            </HoverCardPreview>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Statistics Sidebar */}
                    <div className="space-y-4">
                        {/* Quick Stats */}
                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-base">
                                    Übersicht
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Karten gesamt
                                    </span>
                                    <span className="font-semibold">
                                        {statistics.total_cards}
                                    </span>
                                </div>
                                {Object.entries(statistics.zones).map(
                                    ([zoneName, count]) => (
                                        <div
                                            key={zoneName}
                                            className="flex justify-between"
                                        >
                                            <span className="text-sm text-muted-foreground">
                                                {zoneName}
                                            </span>
                                            <span className="text-sm">
                                                {count}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </CardContent>
                        </Card>

                        {/* Mana/Pitch Curve */}
                        {Object.keys(statistics.mana_curve).length > 0 && (
                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-base">
                                        {game.slug === 'fab'
                                            ? 'Pitch-Verteilung'
                                            : 'Manakurve'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex h-24 items-end justify-around gap-1">
                                        {Object.entries(statistics.mana_curve)
                                            .sort(
                                                ([a], [b]) =>
                                                    Number(a) - Number(b),
                                            )
                                            .map(([cost, count]) => {
                                                const maxCount = Math.max(
                                                    ...Object.values(
                                                        statistics.mana_curve,
                                                    ),
                                                );
                                                const heightPercent =
                                                    (count / maxCount) * 100;
                                                const pitchColors: Record<
                                                    string,
                                                    string
                                                > = {
                                                    '1': 'bg-destructive',
                                                    '2': 'bg-warning',
                                                    '3': 'bg-info',
                                                };
                                                const barColor =
                                                    game.slug === 'fab'
                                                        ? pitchColors[cost] ||
                                                          'bg-primary'
                                                        : 'bg-primary';

                                                return (
                                                    <div
                                                        key={cost}
                                                        className="flex flex-1 flex-col items-center"
                                                    >
                                                        <span className="mb-1 text-xs text-muted-foreground">
                                                            {count}
                                                        </span>
                                                        <div
                                                            className={`w-full max-w-8 rounded-t ${barColor}`}
                                                            style={{
                                                                height: `${heightPercent}%`,
                                                                minHeight:
                                                                    count > 0
                                                                        ? '4px'
                                                                        : '0',
                                                            }}
                                                        />
                                                        <span className="mt-1 text-xs font-medium">
                                                            {cost}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Type Distribution */}
                        {Object.keys(statistics.type_distribution).length >
                            0 && (
                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-base">
                                        Kartentypen
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {Object.entries(
                                            statistics.type_distribution,
                                        )
                                            .sort(([, a], [, b]) => b - a)
                                            .slice(0, 8)
                                            .map(([type, count]) => {
                                                const percent =
                                                    (count /
                                                        statistics.total_cards) *
                                                    100;
                                                return (
                                                    <div key={type}>
                                                        <div className="mb-1 flex justify-between text-sm">
                                                            <span className="truncate">
                                                                {type}
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {count}
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className="h-full rounded-full bg-primary"
                                                                style={{
                                                                    width: `${percent}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Color Distribution */}
                        {Object.keys(statistics.color_distribution).length >
                            0 && (
                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-base">
                                        Farben
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(
                                            statistics.color_distribution,
                                        )
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([color, count]) => (
                                                <Badge
                                                    key={color}
                                                    variant="secondary"
                                                >
                                                    {color}: {count}
                                                </Badge>
                                            ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Card Preview Dialog */}
            <Dialog
                open={!!previewCard}
                onOpenChange={(open) => !open && setPreviewCard(null)}
            >
                <DialogContent className="max-w-md overflow-hidden border-0 bg-transparent p-0">
                    {previewCard?.image_url && (
                        <img
                            src={previewCard.image_url}
                            alt={previewCard.card?.name}
                            className="h-auto w-full rounded-lg"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
