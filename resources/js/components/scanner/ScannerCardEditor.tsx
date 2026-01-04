import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Camera, Plus, Search, XCircle } from 'lucide-react';
import type { PendingCard, RecognitionResult } from './types';

interface ScannerCardEditorProps {
    editingPendingCard: PendingCard | null;
    notFoundRecognition: RecognitionResult | null;
    conditions: Record<string, string>;
    foilings: Record<string, string>;
    languages: Record<string, string>;
    onUpdateCondition: (id: string, condition: string) => void;
    onUpdateFoiling: (id: string, foiling: string | null) => void;
    onUpdateLanguage: (id: string, language: string) => void;
    onRemovePending: (id: string) => void;
    onFinishEditing: () => void;
    onManualSearch: (query: string) => void;
    onCreateCustomCard: (recognition: RecognitionResult) => void;
    onCloseNotFound: () => void;
    getRarityLabel?: (rarity: string) => string;
    getFoilingLabel?: (foiling: string | null) => string;
}

export function ScannerCardEditor({
    editingPendingCard,
    notFoundRecognition,
    conditions,
    foilings,
    languages,
    onUpdateCondition,
    onUpdateFoiling,
    onUpdateLanguage,
    onRemovePending,
    onFinishEditing,
    onManualSearch,
    onCreateCustomCard,
    onCloseNotFound,
    getRarityLabel = (r) => r,
    getFoilingLabel = (f) => f ?? 'Standard',
}: ScannerCardEditorProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Karte bearbeiten</CardTitle>
                <CardDescription>Klicke auf eine Karte in der Warteschlange zum Bearbeiten</CardDescription>
            </CardHeader>
            <CardContent>
                {editingPendingCard ? (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <CardImage
                                src={editingPendingCard.card.image_url}
                                alt={editingPendingCard.card.card_name}
                                className="h-48 w-36 rounded-lg object-cover shadow"
                                placeholderClassName="h-48 w-36 rounded-lg"
                            />
                            <div className="flex-1 space-y-2">
                                <h3 className="flex items-center gap-2 text-xl font-bold">
                                    {editingPendingCard.card.card_name}
                                    {editingPendingCard.card.is_custom && (
                                        <Badge variant="secondary" className="text-xs">
                                            Custom
                                        </Badge>
                                    )}
                                </h3>
                                <p className="text-muted-foreground">
                                    {editingPendingCard.card.set_name} - {editingPendingCard.card.collector_number}
                                </p>
                                <div className="flex gap-2">
                                    {editingPendingCard.card.rarity && (
                                        <Badge variant="outline">{getRarityLabel(editingPendingCard.card.rarity)}</Badge>
                                    )}
                                    <Badge variant="secondary">{getFoilingLabel(editingPendingCard.card.foiling)}</Badge>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Zustand</Label>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(conditions).map(([key, label]) => (
                                    <Button
                                        key={key}
                                        variant={editingPendingCard.condition === key ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateCondition(editingPendingCard.id, key);
                                        }}
                                        className="flex-1"
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Foiling</Label>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(foilings).map(([key, label]) => (
                                    <Button
                                        key={key}
                                        variant={
                                            (editingPendingCard.foiling ?? editingPendingCard.card.foiling) === key
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateFoiling(editingPendingCard.id, key);
                                        }}
                                        className="flex-1"
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Sprache</Label>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(languages).map(([key]) => (
                                    <Button
                                        key={key}
                                        variant={editingPendingCard.language === key ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateLanguage(editingPendingCard.id, key);
                                        }}
                                    >
                                        {key}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={onFinishEditing}>
                                Fertig
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    onRemovePending(editingPendingCard.id);
                                    onFinishEditing();
                                }}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Entfernen
                            </Button>
                        </div>
                    </div>
                ) : notFoundRecognition ? (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950">
                            <div className="flex items-start gap-3">
                                <XCircle className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Karte nicht in Datenbank</h4>
                                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                                        Die KI hat die Karte erkannt, aber sie wurde nicht in der Kartendatenbank gefunden.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Erkannte Daten:</h4>
                            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
                                {notFoundRecognition.card_name && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Kartenname:</span>
                                        <span className="font-medium">{notFoundRecognition.card_name}</span>
                                    </div>
                                )}
                                {notFoundRecognition.set_code && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Set-Code:</span>
                                        <span className="font-mono font-medium">{notFoundRecognition.set_code}</span>
                                    </div>
                                )}
                                {notFoundRecognition.collector_number && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Nummer:</span>
                                        <span className="font-mono font-medium">{notFoundRecognition.collector_number}</span>
                                    </div>
                                )}
                                {notFoundRecognition.foiling && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Foiling:</span>
                                        <span className="font-medium">{notFoundRecognition.foiling}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Versuche die Karte manuell zu suchen oder lege sie als eigene Karte an.
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        const query = notFoundRecognition.card_name ?? notFoundRecognition.collector_number ?? '';
                                        onManualSearch(query);
                                    }}
                                >
                                    <Search className="mr-2 h-4 w-4" />
                                    Manuell suchen
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => onCreateCustomCard(notFoundRecognition)}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Als eigene Karte
                                </Button>
                            </div>
                            <Button variant="ghost" size="sm" className="w-full" onClick={onCloseNotFound}>
                                Schließen
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        <Camera className="mx-auto mb-2 h-12 w-12 opacity-50" />
                        <p>Scanne oder suche eine Karte</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
