import FolderScanController from '@/actions/App/Http/Controllers/FolderScanController';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { FolderSearch, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

interface GameOption {
    id: number;
    slug: string;
    name: string;
}

interface LotOption {
    id: number;
    label: string;
}

interface ScanItem {
    file: string;
    page: number;
    recognized: string | null;
    matched: string | null;
    status: string;
}

interface ScanStatus {
    state: 'queued' | 'running' | 'done' | 'failed';
    pages?: number;
    matched?: number;
    error?: string;
    summary?: {
        processed_files: number;
        pages: number;
        matched: number;
        unmatched: number;
        failed: number;
        items: ScanItem[];
    } | null;
}

interface Props {
    games: GameOption[];
    lots: LotOption[];
    defaultPath: string;
    conditions: Record<string, string>;
    languages: Record<string, string>;
    scanStatus: ScanStatus | null;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Ordner-Scanner', href: '/scanner/folder' }];

export default function FolderScanner({ games, lots, defaultPath, conditions, languages, scanStatus }: Props) {
    const form = useForm({
        game: games[0]?.slug ?? '',
        path: defaultPath,
        lot_id: lots[0] ? String(lots[0].id) : '',
        condition: 'NM',
        language: 'EN',
        dry_run: false as boolean,
    });

    const isRunning = scanStatus?.state === 'queued' || scanStatus?.state === 'running';

    // Poll the status while a scan is queued or running.
    useEffect(() => {
        if (!isRunning) {
            return;
        }
        const interval = setInterval(() => {
            router.reload({ only: ['scanStatus'] });
        }, 3000);
        return () => clearInterval(interval);
    }, [isRunning]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(FolderScanController.scan().url, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ordner-Scanner" />

            <div className="space-y-6 p-6">
                <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold">
                        <FolderSearch className="h-7 w-7" /> Ordner-Scanner
                    </h1>
                    <p className="text-muted-foreground">
                        Liest gescannte Karten (PDF/Bilder) aus einem Ordner, erkennt sie per KI und fügt Treffer ins Inventar ein.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Scan konfigurieren</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="game">Spiel</Label>
                                <Select value={form.data.game} onValueChange={(v) => form.setData('game', v)}>
                                    <SelectTrigger id="game">
                                        <SelectValue placeholder="Spiel wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {games.map((g) => (
                                            <SelectItem key={g.id} value={g.slug}>
                                                {g.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.game && <p className="text-sm text-red-600">{form.errors.game}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="path">Ordner-Pfad</Label>
                                <Input id="path" value={form.data.path} onChange={(e) => form.setData('path', e.target.value)} />
                                {form.errors.path && <p className="text-sm text-red-600">{form.errors.path}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lot">Lot (Ziel-Inventar)</Label>
                                <Select value={form.data.lot_id} onValueChange={(v) => form.setData('lot_id', v)}>
                                    <SelectTrigger id="lot">
                                        <SelectValue placeholder="Lot wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {lots.map((l) => (
                                            <SelectItem key={l.id} value={String(l.id)}>
                                                {l.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.lot_id && <p className="text-sm text-red-600">{form.errors.lot_id}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label htmlFor="condition">Zustand</Label>
                                    <Select value={form.data.condition} onValueChange={(v) => form.setData('condition', v)}>
                                        <SelectTrigger id="condition">
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
                                <div className="space-y-2">
                                    <Label htmlFor="language">Sprache</Label>
                                    <Select value={form.data.language} onValueChange={(v) => form.setData('language', v)}>
                                        <SelectTrigger id="language">
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

                            <div className="flex items-center gap-3 sm:col-span-2">
                                <Switch id="dry_run" checked={form.data.dry_run} onCheckedChange={(v) => form.setData('dry_run', v)} />
                                <Label htmlFor="dry_run">Nur testen (Dry-Run) – nichts ins Inventar schreiben, Dateien behalten</Label>
                            </div>

                            <div className="sm:col-span-2">
                                <Button type="submit" disabled={form.processing || isRunning}>
                                    {(form.processing || isRunning) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isRunning ? 'Scan läuft …' : 'Scan starten'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {scanStatus && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                                Status: {scanStatus.state}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {scanStatus.state === 'failed' && <p className="text-sm text-red-600">{scanStatus.error}</p>}

                            {isRunning && (
                                <p className="text-sm text-muted-foreground">
                                    Verarbeitet: {scanStatus.pages ?? 0} Seite(n), {scanStatus.matched ?? 0} Treffer …
                                </p>
                            )}

                            {scanStatus.summary && (
                                <>
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <span>Dateien: <b>{scanStatus.summary.processed_files}</b></span>
                                        <span>Seiten: <b>{scanStatus.summary.pages}</b></span>
                                        <span className="text-green-600">Importiert/Treffer: <b>{scanStatus.summary.matched}</b></span>
                                        <span className="text-amber-600">Ohne Treffer: <b>{scanStatus.summary.unmatched}</b></span>
                                        <span className="text-red-600">Fehlgeschlagen: <b>{scanStatus.summary.failed}</b></span>
                                    </div>
                                    <div className="max-h-80 overflow-auto rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 text-left">
                                                <tr>
                                                    <th className="p-2">Datei</th>
                                                    <th className="p-2">Seite</th>
                                                    <th className="p-2">Erkannt</th>
                                                    <th className="p-2">Treffer</th>
                                                    <th className="p-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {scanStatus.summary.items.map((item, i) => (
                                                    <tr key={i} className="border-t">
                                                        <td className="p-2">{item.file}</td>
                                                        <td className="p-2">{item.page}</td>
                                                        <td className="p-2">{item.recognized ?? '—'}</td>
                                                        <td className="p-2">{item.matched ?? '—'}</td>
                                                        <td className="p-2">{item.status}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
