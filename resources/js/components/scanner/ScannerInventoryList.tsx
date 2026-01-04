import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ScannedCard } from './types';

interface ScannerInventoryListProps {
    scannedCards: ScannedCard[];
    lotCardCount: number;
    maxDisplay?: number;
}

export function ScannerInventoryList({ scannedCards, lotCardCount, maxDisplay = 10 }: ScannerInventoryListProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Im Inventar</span>
                    <Badge variant="secondary">{lotCardCount}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {scannedCards.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Karte</TableHead>
                                <TableHead>Zustand</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scannedCards.slice(0, maxDisplay).map((card) => (
                                <TableRow key={`${card.id}-${card.is_custom ? 'custom' : 'regular'}`}>
                                    <TableCell>{card.position}</TableCell>
                                    <TableCell className="flex items-center gap-1">
                                        {card.card_name}
                                        {card.is_custom && (
                                            <Badge variant="secondary" className="px-1 text-[10px]">
                                                C
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{card.condition}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="py-4 text-center text-muted-foreground">Noch keine Karten in diesem Lot</p>
                )}
            </CardContent>
        </Card>
    );
}
