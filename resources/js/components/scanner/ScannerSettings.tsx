import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, Timer } from 'lucide-react';
import type { BulkModeSettings } from './types';

interface ScannerSettingsProps {
    selectedCondition: string;
    selectedFoiling: string | null;
    selectedLanguage: string;
    conditions: Record<string, string>;
    foilings: Record<string, string>;
    languages: Record<string, string>;
    onConditionChange: (condition: string) => void;
    onFoilingChange: (foiling: string | null) => void;
    onLanguageChange: (language: string) => void;
}

export function ScannerSettings({
    selectedCondition,
    selectedFoiling,
    selectedLanguage,
    conditions,
    foilings,
    languages,
    onConditionChange,
    onFoilingChange,
    onLanguageChange,
}: ScannerSettingsProps) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5" />
                    Scan-Einstellungen
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                        <Label className="text-sm">Zustand</Label>
                        <Select value={selectedCondition} onValueChange={onConditionChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(conditions).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">Foiling</Label>
                        <Select value={selectedFoiling ?? 'none'} onValueChange={(v) => onFoilingChange(v === 'none' ? null : v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Von Karte</SelectItem>
                                {Object.entries(foilings).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm">Sprache</Label>
                        <Select value={selectedLanguage} onValueChange={onLanguageChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(languages).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

interface ScannerBulkModeProps {
    bulkMode: BulkModeSettings;
    replacingCardId: string | null;
    onBulkModeChange: (bulkMode: BulkModeSettings) => void;
    onCancelReplacing: () => void;
}

export function ScannerBulkMode({ bulkMode, replacingCardId, onBulkModeChange, onCancelReplacing }: ScannerBulkModeProps) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        Bulk-Scan Modus
                    </span>
                    <Switch
                        checked={bulkMode.enabled}
                        onCheckedChange={(checked) => {
                            onBulkModeChange({ ...bulkMode, enabled: checked });
                        }}
                    />
                </CardTitle>
            </CardHeader>
            {bulkMode.enabled && (
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label>Intervall:</Label>
                            <Select
                                value={bulkMode.interval.toString()}
                                onValueChange={(v) => {
                                    onBulkModeChange({ ...bulkMode, interval: parseInt(v) });
                                }}
                            >
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                                        <SelectItem key={s} value={s.toString()}>
                                            {s}s
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-sm text-muted-foreground">Nutzt Einstellungen von oben</p>
                    </div>
                    {replacingCardId && (
                        <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-3 dark:bg-yellow-950">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">Scanne jetzt um Karte zu ersetzen...</p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={onCancelReplacing}>
                                Abbrechen
                            </Button>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
