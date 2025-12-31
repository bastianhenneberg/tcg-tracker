import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { index as boxesIndex, show as boxShow } from '@/routes/boxes';
import { show as lotShow } from '@/routes/lots';
import { type BreadcrumbItem } from '@/types';
import { type Box } from '@/types/inventory';
import { Head, Link } from '@inertiajs/react';
import { Layers, Package } from 'lucide-react';

interface Props {
    box: Box;
}

export default function BoxShow({ box }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Kartons',
            href: boxesIndex().url,
        },
        {
            title: box.name,
            href: boxShow(box).url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={box.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Package className="h-6 w-6" />
                            {box.name}
                        </h1>
                        {box.description && (
                            <p className="text-muted-foreground">{box.description}</p>
                        )}
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/scan">Scanner öffnen</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            Lots ({box.lots?.length ?? 0})
                        </CardTitle>
                        <CardDescription>
                            Alle Scan-Sessions in diesem Karton
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {box.lots && box.lots.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Lot #</TableHead>
                                        <TableHead>Kartenbereich</TableHead>
                                        <TableHead>Karten</TableHead>
                                        <TableHead>Gescannt</TableHead>
                                        <TableHead>Notizen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {box.lots.map((lot) => (
                                        <TableRow key={lot.id} className="cursor-pointer">
                                            <TableCell>
                                                <Link href={lotShow(lot).url} className="font-medium hover:underline">
                                                    #{lot.lot_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {lot.card_range_start && lot.card_range_end ? (
                                                    <Badge variant="outline">
                                                        {lot.card_range_start} - {lot.card_range_end}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge>{lot.inventory_cards_count ?? 0}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {lot.scanned_at
                                                    ? new Date(lot.scanned_at).toLocaleDateString('de-DE')
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground max-w-xs truncate">
                                                {lot.notes ?? '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Layers className="text-muted-foreground mb-4 h-12 w-12" />
                                <h3 className="text-lg font-medium">Keine Lots</h3>
                                <p className="text-muted-foreground mb-4 text-center">
                                    Starte eine Scan-Session um ein neues Lot zu erstellen.
                                </p>
                                <Button asChild>
                                    <Link href="/scan">Scanner öffnen</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
