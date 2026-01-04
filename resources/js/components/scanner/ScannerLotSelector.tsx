import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Box, Lot } from './types';

interface ScannerLotSelectorProps {
    lots: Lot[];
    boxes: Box[];
    selectedLotId: number | null;
    onSelectLot: (lotId: number) => void;
    onCreateLot: (boxId: string | null, notes: string) => void;
    creatingLot: boolean;
}

export function ScannerLotSelector({
    lots,
    boxes,
    selectedLotId,
    onSelectLot,
    onCreateLot,
    creatingLot,
}: ScannerLotSelectorProps) {
    const [showCreateLot, setShowCreateLot] = useState(false);
    const [newLotBoxId, setNewLotBoxId] = useState<string>('');
    const [newLotNotes, setNewLotNotes] = useState('');

    const handleCreateLot = () => {
        onCreateLot(newLotBoxId || null, newLotNotes);
        setShowCreateLot(false);
        setNewLotBoxId('');
        setNewLotNotes('');
    };

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Lot auswählen</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <Select value={selectedLotId?.toString() ?? ''} onValueChange={(v) => onSelectLot(parseInt(v))}>
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Lot wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                            {lots.map((lot) => (
                                <SelectItem key={lot.id} value={lot.id.toString()}>
                                    Lot #{lot.lot_number}
                                    {lot.box && ` - ${lot.box.name}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => setShowCreateLot(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Neues Lot
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={showCreateLot} onOpenChange={setShowCreateLot}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Neues Lot erstellen</DialogTitle>
                        <DialogDescription>Erstelle ein neues Lot für deine Scan-Session</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Karton (optional)</Label>
                            <Select value={newLotBoxId} onValueChange={setNewLotBoxId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Karton wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {boxes.map((box) => (
                                        <SelectItem key={box.id} value={box.id.toString()}>
                                            {box.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Notizen (optional)</Label>
                            <Input
                                value={newLotNotes}
                                onChange={(e) => setNewLotNotes(e.target.value)}
                                placeholder="z.B. 'Deckbuilder Box 1'"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateLot(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleCreateLot} disabled={creatingLot}>
                            {creatingLot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Lot erstellen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
