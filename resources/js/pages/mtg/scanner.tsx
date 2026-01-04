import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    type ConditionKey,
    type FinishKey,
    type LanguageKey,
    CONDITIONS,
    FINISHES,
    LANGUAGES,
    getRarityLabel,
    getFinishLabel,
} from '@/types/mtg';
import { Head, router, usePage } from '@inertiajs/react';
import { Camera, CheckCircle, Flashlight, Loader2, Pause, Play, Plus, Search, Settings2, Timer, Upload, XCircle, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface Box {
    id: number;
    name: string;
}

interface Lot {
    id: number;
    lot_number: string;
    box?: Box;
}

interface CardMatch {
    id: number;
    card_name: string;
    set_name: string;
    set_code: string;
    number: string;
    rarity: string | null;
    image_url: string | null;
    has_foil: boolean;
    has_non_foil: boolean;
}

interface ScannedCard {
    id: number;
    card_name: string;
    position: number;
    condition: string;
}

interface RecognitionResult {
    card_name?: string;
    set_code?: string;
    collector_number?: string;
}

interface ScannerFlash {
    success: boolean;
    error?: string;
    recognition?: RecognitionResult;
    match?: CardMatch;
    alternatives?: CardMatch[];
    confirmed?: ScannedCard;
    lot_count?: number;
    newLot?: { id: number; lot_number: string; box_name?: string };
}

interface BulkModeSettings {
    enabled: boolean;
    interval: number;
    defaultCondition: ConditionKey;
    defaultFinish: FinishKey;
    defaultLanguage: LanguageKey;
}

interface PendingCard {
    id: string;
    card: CardMatch;
    condition: ConditionKey;
    finish: FinishKey;
    language: LanguageKey;
    capturedAt: Date;
}

interface ScannerSettings {
    bulkMode: BulkModeSettings;
}

interface Props {
    lots: Lot[];
    boxes: Box[];
    ollamaStatus: {
        available: boolean;
        model: string | null;
    };
    conditions: Record<string, string>;
    finishes: Record<string, string>;
    searchResults: CardMatch[];
    searchQuery: string;
    scannerSettings: ScannerSettings;
}

interface CameraCapabilities {
    zoom?: { min: number; max: number; step: number };
    torch?: boolean;
}

interface CameraSettings {
    zoom: number;
    torch: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Magic: The Gathering',
        href: '/mtg/cards',
    },
    {
        title: 'Scanner',
        href: '/mtg/scanner',
    },
];

export default function MtgScanner({ lots, boxes, ollamaStatus, conditions, searchResults: initialSearchResults, searchQuery: initialSearchQuery, scannerSettings: initialSettings }: Props) {
    const { props } = usePage<{ flash?: { scanner?: ScannerFlash } }>();
    const flash = props.flash?.scanner;

    // Lot state
    const [selectedLotId, setSelectedLotId] = useState<number | null>(lots[0]?.id ?? null);
    const [showCreateLot, setShowCreateLot] = useState(false);
    const [newLotBoxId, setNewLotBoxId] = useState<string>('');
    const [newLotNotes, setNewLotNotes] = useState('');
    const [creatingLot, setCreatingLot] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [searchResults, setSearchResults] = useState<CardMatch[]>(initialSearchResults);
    const [searching, setSearching] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState(0);

    // Selected card state
    const [selectedCard, setSelectedCard] = useState<CardMatch | null>(null);
    const [selectedCondition, setSelectedCondition] = useState<ConditionKey>(initialSettings.bulkMode.defaultCondition);
    const [selectedFinish, setSelectedFinish] = useState<FinishKey>(initialSettings.bulkMode.defaultFinish);
    const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>(initialSettings.bulkMode.defaultLanguage);
    const [confirming, setConfirming] = useState(false);

    // Not found state
    const [notFoundRecognition, setNotFoundRecognition] = useState<RecognitionResult | null>(null);

    // Scanned cards in current lot
    const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
    const [lotCardCount, setLotCardCount] = useState(0);

    // Bulk mode state
    const [bulkMode, setBulkMode] = useState(initialSettings.bulkMode);
    const [bulkScanRunning, setBulkScanRunning] = useState(false);
    const [bulkCountdown, setBulkCountdown] = useState(0);
    const bulkScanIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const bulkCountdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
    const [replacingCardId, setReplacingCardId] = useState<string | null>(null);
    const [confirmingAll, setConfirmingAll] = useState(false);

    // Camera state
    const [showCamera, setShowCamera] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [recognizing, setRecognizing] = useState(false);
    const [showCameraSettings, setShowCameraSettings] = useState(false);
    const [cameraCapabilities, setCameraCapabilities] = useState<CameraCapabilities>({});
    const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
        zoom: 1,
        torch: false,
    });
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const trackRef = useRef<MediaStreamTrack | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Update search results when props change
    useEffect(() => {
        setSearchResults(initialSearchResults);
        setSearching(false);
    }, [initialSearchResults]);

    // Handle flash messages from backend
    useEffect(() => {
        if (!flash) return;

        if (flash.match) {
            setNotFoundRecognition(null);
            if (bulkMode.enabled) {
                const newPendingCard: PendingCard = {
                    id: replacingCardId ?? `pending-${Date.now()}`,
                    card: flash.match,
                    condition: bulkMode.defaultCondition,
                    finish: bulkMode.defaultFinish,
                    language: bulkMode.defaultLanguage,
                    capturedAt: new Date(),
                };

                if (replacingCardId) {
                    setPendingCards((prev) =>
                        prev.map((p) => (p.id === replacingCardId ? newPendingCard : p))
                    );
                    setReplacingCardId(null);
                } else {
                    setPendingCards((prev) => [newPendingCard, ...prev]);
                }
            } else {
                setSelectedCard(flash.match);
                // Apply bulk mode defaults for single card scan
                setSelectedCondition(bulkMode.defaultCondition);
                setSelectedFinish(bulkMode.defaultFinish);
                setSelectedLanguage(bulkMode.defaultLanguage);
                stopCamera();
            }
        } else if (flash.alternatives?.length) {
            setNotFoundRecognition(null);
            setSearchResults(flash.alternatives);
            if (!bulkMode.enabled) {
                stopCamera();
            }
        } else if (flash.success && flash.recognition) {
            setNotFoundRecognition(flash.recognition);
            if (!bulkMode.enabled) {
                stopCamera();
            }
        }

        if (flash.confirmed) {
            setScannedCards((prev) => [flash.confirmed!, ...prev]);
            if (flash.lot_count) setLotCardCount(flash.lot_count);
            setSelectedCard(null);
            setSelectedCondition(bulkMode.defaultCondition);
            setConfirming(false);
            toast.success(`${flash.confirmed.card_name} hinzugefügt`, {
                description: `Position ${flash.confirmed.position} · ${flash.confirmed.condition}`,
            });
            if (!bulkMode.enabled) {
                searchInputRef.current?.focus();
            }
        }

        if (flash.newLot) {
            setSelectedLotId(flash.newLot.id);
            setShowCreateLot(false);
            setNewLotBoxId('');
            setNewLotNotes('');
            setCreatingLot(false);
        }

        if (flash.error) {
            console.error('Scanner error:', flash.error);
            setRecognizing(false);
        }
    }, [flash, bulkMode, selectedLotId, replacingCardId]);

    // Debounced search
    const debouncedSearch = useDebouncedCallback((query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        router.get('/mtg/scanner', { q: query }, {
            preserveState: true,
            preserveScroll: true,
            only: ['searchResults', 'searchQuery'],
        });
    }, 300);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        debouncedSearch(value);
    };

    // Keyboard navigation for search results
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedResultIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedResultIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && searchResults[selectedResultIndex]) {
            e.preventDefault();
            setSelectedCard(searchResults[selectedResultIndex]);
            setSearchQuery('');
            setSearchResults([]);
        }
    };

    // Global keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;

            if (['1', '2', '3', '4', '5'].includes(e.key) && selectedCard) {
                const conditionKeys: ConditionKey[] = ['NM', 'LP', 'MP', 'HP', 'DM'];
                setSelectedCondition(conditionKeys[parseInt(e.key) - 1]);
            }

            if (e.key === 'Enter' && selectedCard && selectedLotId && !confirming) {
                handleConfirm();
            }

            if (e.key === 'Escape') {
                if (showCreateLot) {
                    setShowCreateLot(false);
                } else if (selectedCard) {
                    setSelectedCard(null);
                } else if (showCamera) {
                    stopCamera();
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [selectedCard, showCreateLot, showCamera, confirming, selectedLotId]);

    // Bulk scan interval management
    const startBulkScan = useCallback(() => {
        if (!videoRef.current || !videoReady || bulkScanIntervalRef.current) return;

        setBulkScanRunning(true);
        setBulkCountdown(bulkMode.interval);

        bulkCountdownIntervalRef.current = setInterval(() => {
            setBulkCountdown((prev) => {
                if (prev <= 1) {
                    return bulkMode.interval;
                }
                return prev - 1;
            });
        }, 1000);

        bulkScanIntervalRef.current = setInterval(() => {
            if (videoRef.current && videoReady && !recognizing) {
                capturePhoto();
                setBulkCountdown(bulkMode.interval);
            }
        }, bulkMode.interval * 1000);
    }, [videoReady, bulkMode.interval, recognizing]);

    const stopBulkScan = useCallback(() => {
        if (bulkScanIntervalRef.current) {
            clearInterval(bulkScanIntervalRef.current);
            bulkScanIntervalRef.current = null;
        }
        if (bulkCountdownIntervalRef.current) {
            clearInterval(bulkCountdownIntervalRef.current);
            bulkCountdownIntervalRef.current = null;
        }
        setBulkScanRunning(false);
        setBulkCountdown(0);
    }, []);

    useEffect(() => {
        return () => {
            if (bulkScanIntervalRef.current) {
                clearInterval(bulkScanIntervalRef.current);
            }
            if (bulkCountdownIntervalRef.current) {
                clearInterval(bulkCountdownIntervalRef.current);
            }
        };
    }, []);

    // Save settings to backend
    const saveSettings = useCallback((newBulkMode?: BulkModeSettings) => {
        const settings: Partial<ScannerSettings> = {};
        if (newBulkMode) settings.bulkMode = newBulkMode;

        router.post('/mtg/scanner/settings', settings, {
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    // Pending cards management
    const removePendingCard = (id: string) => {
        setPendingCards((prev) => prev.filter((p) => p.id !== id));
    };

    const updatePendingCardCondition = (id: string, condition: ConditionKey) => {
        setPendingCards((prev) =>
            prev.map((p) => (p.id === id ? { ...p, condition } : p))
        );
    };

    const updatePendingCardFinish = (id: string, finish: FinishKey) => {
        setPendingCards((prev) =>
            prev.map((p) => (p.id === id ? { ...p, finish } : p))
        );
    };

    const confirmAllPendingCards = async () => {
        if (!selectedLotId || pendingCards.length === 0) return;

        setConfirmingAll(true);

        const cards = pendingCards.map((pending) => ({
            mtg_printing_id: pending.card.id,
            condition: pending.condition,
            finish: pending.finish,
            language: pending.language,
        }));

        router.post('/mtg/scanner/confirm-bulk', { lot_id: selectedLotId, cards }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setPendingCards([]);
                toast.success(`${cards.length} Karten hinzugefügt`);
            },
            onFinish: () => setConfirmingAll(false),
        });
    };

    // Camera functions
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            });
            streamRef.current = stream;
            setVideoReady(false);
            setShowCamera(true);

            const videoTrack = stream.getVideoTracks()[0];
            trackRef.current = videoTrack;

            const capabilities = videoTrack.getCapabilities() as MediaTrackCapabilities & {
                zoom?: { min: number; max: number; step: number };
                torch?: boolean;
            };

            setCameraCapabilities({
                zoom: capabilities.zoom,
                torch: capabilities.torch,
            });

            setTimeout(() => {
                if (videoRef.current && streamRef.current) {
                    videoRef.current.srcObject = streamRef.current;
                    videoRef.current.play().catch((err) => {
                        console.error('Video play failed:', err);
                    });
                }
            }, 100);
        } catch (error) {
            console.error('Camera access denied:', error);
        }
    };

    const stopCamera = () => {
        stopBulkScan();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            trackRef.current = null;
        }
        setShowCamera(false);
        setVideoReady(false);
        setShowCameraSettings(false);
        setCameraCapabilities({});
    };

    const applyCameraSetting = async (setting: Partial<CameraSettings>) => {
        if (!trackRef.current) return;

        const newSettings = { ...cameraSettings, ...setting };
        setCameraSettings(newSettings);

        try {
            type AdvancedConstraint = {
                zoom?: number;
                torch?: boolean;
            };

            const constraints: MediaTrackConstraints & { advanced?: AdvancedConstraint[] } = {
                advanced: [{}],
            };

            const adv = constraints.advanced![0];

            if (setting.zoom !== undefined && cameraCapabilities.zoom) adv.zoom = setting.zoom;
            if (setting.torch !== undefined && cameraCapabilities.torch) adv.torch = setting.torch;

            await trackRef.current.applyConstraints(constraints);
        } catch (error) {
            console.error('Failed to apply camera setting:', error);
        }
    };

    const capturePhoto = async () => {
        if (!videoRef.current) {
            console.error('Video ref not available');
            return;
        }

        const video = videoRef.current;

        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.error('Video dimensions not ready:', video.videoWidth, video.videoHeight);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.9);

        setRecognizing(true);
        router.post('/mtg/scanner/recognize', { image: base64 }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setRecognizing(false),
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;

            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.readAsDataURL(file);
            });

            setRecognizing(true);
            router.post('/mtg/scanner/recognize', { image: base64 }, {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setRecognizing(false),
            });
        }

        e.target.value = '';
    };

    const handleConfirm = useCallback(() => {
        if (!selectedCard || !selectedLotId) return;

        setConfirming(true);

        router.post('/mtg/scanner/confirm', {
            lot_id: selectedLotId,
            mtg_printing_id: selectedCard.id,
            condition: selectedCondition,
            finish: selectedFinish,
            language: selectedLanguage,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }, [selectedCard, selectedLotId, selectedCondition, selectedFinish, selectedLanguage]);

    const handleCreateLot = () => {
        setCreatingLot(true);
        router.post('/mtg/scanner/lot', {
            box_id: newLotBoxId || null,
            notes: newLotNotes || null,
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['lots', 'flash'],
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="MTG Scanner" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Kartenscanner</h1>
                        <p className="text-muted-foreground">
                            Scanne MTG Karten für dein Inventar
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {ollamaStatus.available ? (
                            <Badge variant="outline" className="gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                KI bereit
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                KI nicht verfügbar
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Left: Lot Selection, Search & Camera */}
                    <div className="space-y-4">
                        {/* Lot Selection */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Lot auswählen</CardTitle>
                            </CardHeader>
                            <CardContent className="flex gap-2">
                                <Select
                                    value={selectedLotId?.toString() ?? ''}
                                    onValueChange={(v) => setSelectedLotId(parseInt(v))}
                                >
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

                        {/* Search */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Search className="h-5 w-5" />
                                    Manuelle Suche
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    <Input
                                        ref={searchInputRef}
                                        placeholder="Kartenname, Set-Code oder Nummer..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                    />
                                    {searching && (
                                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
                                    )}
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="mt-2 max-h-64 overflow-y-auto rounded-md border">
                                        {searchResults.map((result, index) => (
                                            <div
                                                key={result.id}
                                                className={`flex cursor-pointer items-center gap-3 p-2 hover:bg-muted/50 ${
                                                    index === selectedResultIndex ? 'bg-muted' : ''
                                                }`}
                                                onClick={() => {
                                                    setSelectedCard(result);
                                                    setSearchQuery('');
                                                    setSearchResults([]);
                                                }}
                                            >
                                                <CardImage
                                                    src={result.image_url}
                                                    alt={result.card_name}
                                                    className="h-12 w-auto rounded"
                                                    placeholderClassName="h-12 w-9 rounded"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{result.card_name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {result.set_name} ({result.set_code.toUpperCase()}) #{result.number}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs shrink-0">
                                                    {getRarityLabel(result.rarity)}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Camera */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Camera className="h-5 w-5" />
                                        Kamera
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            id="mtg-file-upload"
                                            onChange={handleFileUpload}
                                        />
                                        <Button variant="outline" size="sm" asChild>
                                            <label htmlFor="mtg-file-upload" className="cursor-pointer">
                                                <Upload className="mr-2 h-4 w-4" />
                                                Bild hochladen
                                            </label>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {!showCamera ? (
                                    <Button
                                        onClick={startCamera}
                                        disabled={!ollamaStatus.available}
                                        className="w-full"
                                    >
                                        <Camera className="mr-2 h-4 w-4" />
                                        Kamera starten
                                    </Button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="h-full w-full object-cover"
                                                onLoadedMetadata={() => setVideoReady(true)}
                                            />
                                            {recognizing && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                                                </div>
                                            )}
                                            {bulkScanRunning && (
                                                <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/70 px-2 py-1 text-white">
                                                    <Timer className="h-4 w-4" />
                                                    <span>{bulkCountdown}s</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={capturePhoto}
                                                disabled={!videoReady || recognizing}
                                                className="flex-1"
                                            >
                                                {recognizing ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Camera className="mr-2 h-4 w-4" />
                                                )}
                                                Foto aufnehmen
                                            </Button>
                                            <Button variant="outline" onClick={stopCamera}>
                                                Stopp
                                            </Button>
                                        </div>

                                        {/* Bulk Mode Controls */}
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={bulkMode.enabled}
                                                    onCheckedChange={(checked) => {
                                                        const newBulkMode = { ...bulkMode, enabled: checked };
                                                        setBulkMode(newBulkMode);
                                                        saveSettings(newBulkMode);
                                                        if (!checked) stopBulkScan();
                                                    }}
                                                />
                                                <Label>Bulk-Modus</Label>
                                            </div>
                                            {bulkMode.enabled && (
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        value={bulkMode.interval.toString()}
                                                        onValueChange={(v) => {
                                                            const newBulkMode = { ...bulkMode, interval: parseInt(v) };
                                                            setBulkMode(newBulkMode);
                                                            saveSettings(newBulkMode);
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-20">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="2">2s</SelectItem>
                                                            <SelectItem value="3">3s</SelectItem>
                                                            <SelectItem value="5">5s</SelectItem>
                                                            <SelectItem value="10">10s</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant={bulkScanRunning ? 'destructive' : 'default'}
                                                        size="sm"
                                                        onClick={bulkScanRunning ? stopBulkScan : startBulkScan}
                                                        disabled={!videoReady}
                                                    >
                                                        {bulkScanRunning ? (
                                                            <><Pause className="mr-1 h-3 w-3" /> Stop</>
                                                        ) : (
                                                            <><Play className="mr-1 h-3 w-3" /> Start</>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Camera Settings */}
                                        {(cameraCapabilities.zoom || cameraCapabilities.torch) && (
                                            <div className="space-y-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-between"
                                                    onClick={() => setShowCameraSettings(!showCameraSettings)}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Settings2 className="h-4 w-4" />
                                                        Kameraeinstellungen
                                                    </span>
                                                </Button>
                                                {showCameraSettings && (
                                                    <div className="space-y-3 rounded-lg border p-3">
                                                        {cameraCapabilities.zoom && (
                                                            <div className="space-y-1">
                                                                <Label className="flex items-center gap-2">
                                                                    <ZoomIn className="h-4 w-4" />
                                                                    Zoom: {cameraSettings.zoom.toFixed(1)}x
                                                                </Label>
                                                                <input
                                                                    type="range"
                                                                    min={cameraCapabilities.zoom.min}
                                                                    max={cameraCapabilities.zoom.max}
                                                                    step={cameraCapabilities.zoom.step}
                                                                    value={cameraSettings.zoom}
                                                                    onChange={(e) => applyCameraSetting({ zoom: parseFloat(e.target.value) })}
                                                                    className="w-full"
                                                                />
                                                            </div>
                                                        )}
                                                        {cameraCapabilities.torch && (
                                                            <div className="flex items-center justify-between">
                                                                <Label className="flex items-center gap-2">
                                                                    <Flashlight className="h-4 w-4" />
                                                                    Taschenlampe
                                                                </Label>
                                                                <Switch
                                                                    checked={cameraSettings.torch}
                                                                    onCheckedChange={(checked) => applyCameraSetting({ torch: checked })}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Not Found Card */}
                        {notFoundRecognition && (
                            <Card className="border-orange-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg text-orange-500">Karte nicht gefunden</CardTitle>
                                    <CardDescription>
                                        Die KI hat erkannt: {notFoundRecognition.card_name}
                                        {notFoundRecognition.set_code && ` (${notFoundRecognition.set_code})`}
                                        {notFoundRecognition.collector_number && ` #${notFoundRecognition.collector_number}`}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Versuche eine manuelle Suche oder überprüfe die Kartendatenbank.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right: Selected Card & Pending Cards */}
                    <div className="space-y-4">
                        {/* Selected Card */}
                        {selectedCard && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        Ausgewählte Karte
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-4">
                                        <CardImage
                                            src={selectedCard.image_url}
                                            alt={selectedCard.card_name}
                                            className="h-48 w-auto rounded-lg"
                                            placeholderClassName="h-48 w-36 rounded-lg"
                                        />
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <h3 className="text-lg font-semibold">{selectedCard.card_name}</h3>
                                                <p className="text-muted-foreground">
                                                    {selectedCard.set_name} ({selectedCard.set_code.toUpperCase()}) #{selectedCard.number}
                                                </p>
                                            </div>

                                            <div className="grid gap-2 sm:grid-cols-3">
                                                <div>
                                                    <Label className="text-xs">Zustand</Label>
                                                    <Select
                                                        value={selectedCondition}
                                                        onValueChange={(v) => setSelectedCondition(v as ConditionKey)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(CONDITIONS).map(([key, label]) => (
                                                                <SelectItem key={key} value={key}>
                                                                    {label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <Label className="text-xs">Finish</Label>
                                                    <Select
                                                        value={selectedFinish}
                                                        onValueChange={(v) => setSelectedFinish(v as FinishKey)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {selectedCard.has_non_foil && (
                                                                <SelectItem value="nonfoil">Non-Foil</SelectItem>
                                                            )}
                                                            {selectedCard.has_foil && (
                                                                <SelectItem value="foil">Foil</SelectItem>
                                                            )}
                                                            <SelectItem value="etched">Etched Foil</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <Label className="text-xs">Sprache</Label>
                                                    <Select
                                                        value={selectedLanguage}
                                                        onValueChange={(v) => setSelectedLanguage(v as LanguageKey)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(LANGUAGES).map(([key, label]) => (
                                                                <SelectItem key={key} value={key}>
                                                                    {label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <Button
                                                onClick={handleConfirm}
                                                disabled={!selectedLotId || confirming}
                                                className="w-full"
                                            >
                                                {confirming ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Wird hinzugefügt...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Zum Inventar hinzufügen
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Pending Cards (Bulk Mode) */}
                        {pendingCards.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">
                                            Warteschlange ({pendingCards.length})
                                        </CardTitle>
                                        <Button
                                            onClick={confirmAllPendingCards}
                                            disabled={confirmingAll || !selectedLotId}
                                            size="sm"
                                        >
                                            {confirmingAll ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                            )}
                                            Alle hinzufügen
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Karte</TableHead>
                                                <TableHead>Zustand</TableHead>
                                                <TableHead>Finish</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingCards.map((pending) => (
                                                <TableRow key={pending.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <CardImage
                                                                src={pending.card.image_url}
                                                                alt={pending.card.card_name}
                                                                className="h-10 w-auto rounded"
                                                                placeholderClassName="h-10 w-8 rounded"
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="font-medium truncate text-sm">
                                                                    {pending.card.card_name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {pending.card.set_code.toUpperCase()} #{pending.card.number}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={pending.condition}
                                                            onValueChange={(v) => updatePendingCardCondition(pending.id, v as ConditionKey)}
                                                        >
                                                            <SelectTrigger className="h-8 w-20">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Object.entries(CONDITIONS).map(([key, label]) => (
                                                                    <SelectItem key={key} value={key}>
                                                                        {key}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={pending.finish}
                                                            onValueChange={(v) => updatePendingCardFinish(pending.id, v as FinishKey)}
                                                        >
                                                            <SelectTrigger className="h-8 w-24">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="nonfoil">Non-Foil</SelectItem>
                                                                <SelectItem value="foil">Foil</SelectItem>
                                                                <SelectItem value="etched">Etched</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removePendingCard(pending.id)}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recent Scanned Cards */}
                        {scannedCards.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">Zuletzt hinzugefügt</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableBody>
                                            {scannedCards.slice(0, 5).map((card) => (
                                                <TableRow key={card.id}>
                                                    <TableCell>
                                                        <span className="text-muted-foreground">#{card.position}</span>
                                                    </TableCell>
                                                    <TableCell>{card.card_name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{card.condition}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Lot Dialog */}
            <Dialog open={showCreateLot} onOpenChange={setShowCreateLot}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Neues Lot erstellen</DialogTitle>
                        <DialogDescription>
                            Ein Lot ist eine Gruppe von Karten, z.B. ein gekauftes Bundle.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Box (optional)</Label>
                            <Select value={newLotBoxId} onValueChange={setNewLotBoxId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Keine Box" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Keine Box</SelectItem>
                                    {boxes.map((box) => (
                                        <SelectItem key={box.id} value={box.id.toString()}>
                                            {box.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Notizen (optional)</Label>
                            <Input
                                value={newLotNotes}
                                onChange={(e) => setNewLotNotes(e.target.value)}
                                placeholder="z.B. Cardmarket Bestellung #123"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateLot(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleCreateLot} disabled={creatingLot}>
                            {creatingLot && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Lot erstellen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
