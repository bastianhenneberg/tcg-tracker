import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type Game, type UnifiedSet } from '@/types/unified';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useState } from 'react';

interface PrintSlot {
    id: number;
    collector_number: string;
    name: string | null;
    rarity_label: string | null;
    image_url: string | null;
}

interface Props {
    game: Game;
    set: UnifiedSet;
    pages: PrintSlot[][];
    slotsPerPage: number;
    cardCount: number;
}

export default function SetPrint({
    game,
    set,
    pages,
    slotsPerPage,
    cardCount,
}: Props) {
    const [showImages, setShowImages] = useState(true);
    const baseUrl = `/g/${game.slug}`;

    return (
        <>
            <Head title={`Druckblatt: ${set.name}`} />

            {/*
              Print layout: a self-contained page (no app sidebar) so it prints clean.
              Controls carry `.no-print` and are hidden via @media print.
            */}
            <style>{`
                @page { size: A4 portrait; margin: 10mm; }
                @media print {
                    .no-print { display: none !important; }
                    .binder-page { break-after: page; }
                    .binder-page:last-child { break-after: auto; }
                    html, body { background: #fff !important; }
                }
                .binder-page { break-inside: avoid; }
            `}</style>

            <div className="min-h-screen bg-muted/30 text-foreground print:bg-white">
                {/* Control bar (screen only) */}
                <div className="no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
                    <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
                        <Link href={`${baseUrl}/sets/${set.id}`}>
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Zurück
                            </Button>
                        </Link>

                        <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{set.name}</p>
                            <p className="text-xs text-muted-foreground">
                                [{set.code}] · {cardCount} Karten ·{' '}
                                {pages.length}{' '}
                                {pages.length === 1 ? 'Seite' : 'Seiten'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                id="show-images"
                                checked={showImages}
                                onCheckedChange={setShowImages}
                            />
                            <Label
                                htmlFor="show-images"
                                className="cursor-pointer text-sm"
                            >
                                Bilder anzeigen
                            </Label>
                        </div>

                        <Button size="sm" onClick={() => window.print()}>
                            <Printer className="mr-1 h-4 w-4" />
                            Drucken
                        </Button>
                    </div>
                </div>

                {/* Pages */}
                <div className="mx-auto flex max-w-4xl flex-col gap-8 p-4 print:max-w-none print:gap-0 print:p-0">
                    {pages.length === 0 ? (
                        <div className="rounded-lg border py-16 text-center text-muted-foreground">
                            Keine Karten in diesem Set.
                        </div>
                    ) : (
                        pages.map((slots, pageIndex) => (
                            <section
                                key={pageIndex}
                                className="binder-page rounded-lg border bg-white p-4 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
                            >
                                <div className="no-print mb-3 flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {set.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Seite {pageIndex + 1} / {pages.length}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 print:gap-1.5">
                                    {Array.from({ length: slotsPerPage }).map(
                                        (_, slotIndex) => {
                                            const slot = slots[slotIndex];

                                            return (
                                                <div
                                                    key={slotIndex}
                                                    className="relative flex aspect-[2.5/3.5] flex-col overflow-hidden rounded-md border border-neutral-300 bg-white"
                                                >
                                                    {slot ? (
                                                        showImages &&
                                                        slot.image_url ? (
                                                            <>
                                                                <img
                                                                    src={
                                                                        slot.image_url
                                                                    }
                                                                    alt={
                                                                        slot.name ??
                                                                        slot.collector_number
                                                                    }
                                                                    className="h-full w-full object-contain"
                                                                    loading="lazy"
                                                                />
                                                                <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                                    #
                                                                    {
                                                                        slot.collector_number
                                                                    }
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
                                                                <span className="text-lg leading-none font-bold">
                                                                    #
                                                                    {
                                                                        slot.collector_number
                                                                    }
                                                                </span>
                                                                <span className="line-clamp-3 text-xs leading-tight font-medium">
                                                                    {slot.name ??
                                                                        '—'}
                                                                </span>
                                                                {slot.rarity_label && (
                                                                    <span className="text-[10px] text-muted-foreground uppercase">
                                                                        {
                                                                            slot.rarity_label
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center">
                                                            <span className="text-xs text-neutral-300">
                                                                leer
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        },
                                    )}
                                </div>
                            </section>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
