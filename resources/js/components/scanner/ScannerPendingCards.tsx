import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, CheckCircle, Loader2, XCircle } from 'lucide-react';
import type { PendingCard } from './types';

interface ScannerPendingCardsProps {
    pendingCards: PendingCard[];
    editingPendingId: string | null;
    replacingCardId: string | null;
    confirmingAll: boolean;
    selectedLotId: number | null;
    conditions: Record<string, string>;
    foilings: Record<string, string>;
    languages: Record<string, string>;
    onEditPending: (id: string | null) => void;
    onUpdateCondition: (id: string, condition: string) => void;
    onUpdateFoiling: (id: string, foiling: string | null) => void;
    onUpdateLanguage: (id: string, language: string) => void;
    onRescan: (id: string) => void;
    onRemove: (id: string) => void;
    onConfirmAll: () => void;
    onClear: () => void;
}

export function ScannerPendingCards({
    pendingCards,
    editingPendingId,
    replacingCardId,
    confirmingAll,
    selectedLotId,
    conditions,
    foilings,
    languages,
    onEditPending,
    onUpdateCondition,
    onUpdateFoiling,
    onUpdateLanguage,
    onRescan,
    onRemove,
    onConfirmAll,
    onClear,
}: ScannerPendingCardsProps) {
    if (pendingCards.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                    <span>Warteschlange</span>
                    <Badge variant="secondary">{pendingCards.length}</Badge>
                </CardTitle>
                <CardDescription>Karten vor dem Hinzufügen prüfen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="max-h-64 space-y-2 overflow-y-auto">
                    {pendingCards.map((pending) => (
                        <div
                            key={pending.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-2 transition-colors hover:bg-muted/50 ${
                                replacingCardId === pending.id ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''
                            } ${editingPendingId === pending.id ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => onEditPending(editingPendingId === pending.id ? null : pending.id)}
                        >
                            <CardImage
                                src={pending.card.image_url}
                                alt={pending.card.card_name}
                                className="h-16 w-12 rounded object-cover"
                                placeholderClassName="h-16 w-12 rounded"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1 truncate font-medium">
                                    {pending.card.card_name}
                                    {pending.card.is_custom && (
                                        <Badge variant="secondary" className="shrink-0 px-1 text-[10px]">
                                            Custom
                                        </Badge>
                                    )}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {pending.card.set_name} - {pending.card.collector_number}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    <Select
                                        value={pending.condition}
                                        onValueChange={(v) => {
                                            onUpdateCondition(pending.id, v);
                                        }}
                                    >
                                        <SelectTrigger className="h-6 w-16 text-xs" onClick={(e) => e.stopPropagation()}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(conditions).map(([key]) => (
                                                <SelectItem key={key} value={key}>
                                                    {key}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={pending.foiling ?? pending.card.foiling ?? Object.keys(foilings)[0] ?? 'S'}
                                        onValueChange={(v) => {
                                            onUpdateFoiling(pending.id, v);
                                        }}
                                    >
                                        <SelectTrigger className="h-6 w-20 text-xs" onClick={(e) => e.stopPropagation()}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(foilings).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={pending.language}
                                        onValueChange={(v) => {
                                            onUpdateLanguage(pending.id, v);
                                        }}
                                    >
                                        <SelectTrigger className="h-6 w-14 text-xs" onClick={(e) => e.stopPropagation()}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(languages).map(([key]) => (
                                                <SelectItem key={key} value={key}>
                                                    {key}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRescan(pending.id);
                                    }}
                                    title="Neu scannen"
                                >
                                    <Camera className="h-3 w-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(pending.id);
                                    }}
                                    title="Entfernen"
                                >
                                    <XCircle className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 border-t pt-2">
                    <Button onClick={onConfirmAll} disabled={confirmingAll || !selectedLotId} className="flex-1">
                        {confirmingAll ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        An Inventar senden ({pendingCards.length})
                    </Button>
                    <Button variant="outline" onClick={onClear} disabled={confirmingAll}>
                        Leeren
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
