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
    type FoilingKey,
    type LanguageKey,
    CONDITIONS,
    FOILINGS,
    LANGUAGES,
    getRarityLabel,
    getFoilingLabel,
    getPitchColor,
} from '@/types/fab';
import { Head, router, usePage } from '@inertiajs/react';
import { Camera, CheckCircle, Flashlight, Loader2, Pause, Play, Plus, Search, Settings, Settings2, Timer, Upload, XCircle, ZoomIn } from 'lucide-react';
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
    collector_number: string;
    rarity: string | null;
    rarity_label?: string;
    foiling: string | null;
    foiling_label?: string;
    image_url: string | null;
    is_custom?: boolean;
}

interface ScannedCard {
    id: number;
    card_name: string;
    position: number;
    condition: string;
    is_custom?: boolean;
}

interface RecognitionResult {
    card_name?: string;
    set_code?: string;
    collector_number?: string;
    foiling?: string;
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

interface Region {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface TemplateSettings {
    referenceImage?: string;
    regions?: {
        cardName?: Region;
        setCode?: Region;
        collectorNumber?: Region;
    };
}

interface BulkModeSettings {
    enabled: boolean;
    interval: number;
    defaultCondition: ConditionKey;
    defaultFoiling: FoilingKey | null;
    defaultLanguage: LanguageKey;
}

interface PendingCard {
    id: string; // temporary ID for the list
    card: CardMatch;
    condition: ConditionKey;
    foiling: FoilingKey | null;
    language: LanguageKey;
    capturedAt: Date;
}

interface ScannerSettings {
    template: TemplateSettings | null;
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
    foilings: Record<string, string>;
    searchResults: CardMatch[];
    searchQuery: string;
    scannerSettings: ScannerSettings;
}

interface CameraCapabilities {
    zoom?: { min: number; max: number; step: number };
    focusMode?: string[];
    focusDistance?: { min: number; max: number; step: number };
    exposureMode?: string[];
    exposureTime?: { min: number; max: number; step: number };
    brightness?: { min: number; max: number; step: number };
    contrast?: { min: number; max: number; step: number };
    sharpness?: { min: number; max: number; step: number };
    saturation?: { min: number; max: number; step: number };
    torch?: boolean;
}

interface CameraSettings {
    zoom: number;
    focusMode: string;
    focusDistance: number;
    exposureMode: string;
    exposureTime: number;
    brightness: number;
    contrast: number;
    sharpness: number;
    saturation: number;
    torch: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Flesh and Blood',
        href: '/fab/cards',
    },
    {
        title: 'Scanner',
        href: '/fab/scanner',
    },
];

export default function FabScanner({ lots, boxes, ollamaStatus, conditions, searchResults: initialSearchResults, searchQuery: initialSearchQuery, scannerSettings: initialSettings }: Props) {
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
    const [selectedFoiling, setSelectedFoiling] = useState<FoilingKey | null>(initialSettings.bulkMode.defaultFoiling);
    const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>(initialSettings.bulkMode.defaultLanguage);
    const [confirming, setConfirming] = useState(false);

    // Not found state - when recognition worked but no match in database
    const [notFoundRecognition, setNotFoundRecognition] = useState<RecognitionResult | null>(null);

    // Custom card dialog state
    const [showCustomCardDialog, setShowCustomCardDialog] = useState(false);
    const [customCardForm, setCustomCardForm] = useState({
        name: '',
        set_name: '',
        collector_number: '',
        rarity: '',
        foiling: '',
        language: 'DE',
        linked_fab_card_id: null as number | null,
        linked_fab_card_name: '',
        linked_fab_card_pitch: null as number | null,
        linked_fab_card_collector_number: null as string | null,
    });
    const [creatingCustomCard, setCreatingCustomCard] = useState(false);
    const [fabCardSearchQuery, setFabCardSearchQuery] = useState('');
    const [fabCardSearchResults, setFabCardSearchResults] = useState<{
        id: number;
        name: string;
        pitch: number | null;
        collector_number: string | null;
        image_url: string | null;
    }[]>([]);
    const [searchingFabCards, setSearchingFabCards] = useState(false);
    const [hoveredFabCard, setHoveredFabCard] = useState<{ image_url: string | null } | null>(null);

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

    // Template editor state
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [templateSettings, setTemplateSettings] = useState<TemplateSettings | null>(initialSettings.template);
    const [templateImage, setTemplateImage] = useState<string | null>(initialSettings.template?.referenceImage ?? null);
    const [drawingRegion, setDrawingRegion] = useState<'cardName' | 'setCode' | 'collectorNumber' | null>(null);
    const [regions, setRegions] = useState<TemplateSettings['regions']>(initialSettings.template?.regions ?? {});
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const templateCanvasRef = useRef<HTMLCanvasElement>(null);
    const templateImageRef = useRef<HTMLImageElement | null>(null);

    // Camera state
    const [showCamera, setShowCamera] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [recognizing, setRecognizing] = useState(false);
    const [showCameraSettings, setShowCameraSettings] = useState(false);
    const [cameraCapabilities, setCameraCapabilities] = useState<CameraCapabilities>({});
    const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
        zoom: 1,
        focusMode: 'continuous',
        focusDistance: 0,
        exposureMode: 'continuous',
        exposureTime: 100,
        brightness: 128,
        contrast: 128,
        sharpness: 128,
        saturation: 128,
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
        console.log('Flash data received:', flash);
        console.log('Flash details:', {
            hasFlash: !!flash,
            success: flash?.success,
            hasMatch: !!flash?.match,
            hasRecognition: !!flash?.recognition,
            recognition: flash?.recognition,
            alternativesLength: flash?.alternatives?.length,
        });
        if (!flash) return;

        if (flash.match) {
            // Clear not found state when we have a match
            setNotFoundRecognition(null);
            // In bulk mode, add to pending cards list
            if (bulkMode.enabled) {
                const newPendingCard: PendingCard = {
                    id: replacingCardId ?? `pending-${Date.now()}`,
                    card: flash.match,
                    condition: selectedCondition,
                    foiling: selectedFoiling,
                    language: selectedLanguage,
                    capturedAt: new Date(),
                };

                if (replacingCardId) {
                    // Replace existing card
                    setPendingCards((prev) =>
                        prev.map((p) => (p.id === replacingCardId ? newPendingCard : p))
                    );
                    setReplacingCardId(null);
                } else {
                    // Add new card
                    setPendingCards((prev) => [newPendingCard, ...prev]);
                }
            } else {
                setSelectedCard(flash.match);
                stopCamera();
            }
        } else if (flash.alternatives?.length) {
            // Clear not found state when we have alternatives
            setNotFoundRecognition(null);
            setSearchResults(flash.alternatives);
            if (!bulkMode.enabled) {
                stopCamera();
            }
        } else if (flash.success && flash.recognition) {
            // Recognition worked but no match found in database
            console.log('Setting notFoundRecognition:', flash.recognition);
            setNotFoundRecognition(flash.recognition);
            if (!bulkMode.enabled) {
                stopCamera();
            }
        } else {
            console.log('No condition matched:', { success: flash.success, recognition: flash.recognition, match: flash.match, alternatives: flash.alternatives });
        }

        if (flash.confirmed) {
            setScannedCards((prev) => [flash.confirmed!, ...prev]);
            if (flash.lot_count) setLotCardCount(flash.lot_count);
            setSelectedCard(null);
            setSelectedCondition(bulkMode.defaultCondition);
            setConfirming(false);
            toast.success(`${flash.confirmed.card_name} hinzugefügt`, {
                description: `Position ${flash.confirmed.position} · ${flash.confirmed.condition}${flash.confirmed.is_custom ? ' · Custom' : ''}`,
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

    // Debounced search mit router.get
    const debouncedSearch = useDebouncedCallback((query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        router.get('/fab/scanner', { q: query }, {
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
            // Only handle when not in input
            if (document.activeElement?.tagName === 'INPUT') return;

            // Condition shortcuts 1-5
            if (['1', '2', '3', '4', '5'].includes(e.key) && selectedCard) {
                const conditionKeys: ConditionKey[] = ['NM', 'LP', 'MP', 'HP', 'DMG'];
                setSelectedCondition(conditionKeys[parseInt(e.key) - 1]);
            }

            // Enter to confirm
            if (e.key === 'Enter' && selectedCard && selectedLotId && !confirming) {
                handleConfirm();
            }

            // Escape to cancel
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

        // Countdown interval (every second)
        bulkCountdownIntervalRef.current = setInterval(() => {
            setBulkCountdown((prev) => {
                if (prev <= 1) {
                    return bulkMode.interval;
                }
                return prev - 1;
            });
        }, 1000);

        // Photo capture interval
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

    // Cleanup bulk scan on unmount
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
    const saveSettings = useCallback((newBulkMode?: BulkModeSettings, newTemplate?: TemplateSettings | null) => {
        const settings: Partial<ScannerSettings> = {};
        if (newBulkMode) settings.bulkMode = newBulkMode;
        if (newTemplate !== undefined) settings.template = newTemplate;

        router.post('/fab/scanner/settings', settings, {
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    // Template editor functions
    const handleTemplateImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setTemplateImage(base64);
            setRegions({});
        };
        reader.readAsDataURL(file);
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!drawingRegion || !templateCanvasRef.current) return;

        const rect = templateCanvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setDrawStart({ x, y });
    };

    const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!drawingRegion || !drawStart || !templateCanvasRef.current) return;

        const rect = templateCanvasRef.current.getBoundingClientRect();
        const endX = (e.clientX - rect.left) / rect.width;
        const endY = (e.clientY - rect.top) / rect.height;

        const region: Region = {
            x: Math.min(drawStart.x, endX),
            y: Math.min(drawStart.y, endY),
            width: Math.abs(endX - drawStart.x),
            height: Math.abs(endY - drawStart.y),
        };

        setRegions((prev) => ({ ...prev, [drawingRegion]: region }));
        setDrawStart(null);
        setDrawingRegion(null);
    };

    const drawRegionsOnCanvas = useCallback(() => {
        const canvas = templateCanvasRef.current;
        const img = templateImageRef.current;
        if (!canvas || !img || !templateImage) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const colors = {
            cardName: 'rgba(255, 0, 0, 0.5)',
            setCode: 'rgba(0, 255, 0, 0.5)',
            collectorNumber: 'rgba(0, 0, 255, 0.5)',
        };

        Object.entries(regions).forEach(([key, region]) => {
            if (!region) return;
            ctx.fillStyle = colors[key as keyof typeof colors];
            ctx.fillRect(
                region.x * canvas.width,
                region.y * canvas.height,
                region.width * canvas.width,
                region.height * canvas.height
            );
            ctx.strokeStyle = colors[key as keyof typeof colors].replace('0.5', '1');
            ctx.lineWidth = 2;
            ctx.strokeRect(
                region.x * canvas.width,
                region.y * canvas.height,
                region.width * canvas.width,
                region.height * canvas.height
            );
        });
    }, [regions, templateImage]);

    // Redraw when regions change
    useEffect(() => {
        if (templateImage && templateCanvasRef.current) {
            const img = new Image();
            img.onload = () => {
                templateImageRef.current = img;
                const canvas = templateCanvasRef.current!;
                canvas.width = img.width;
                canvas.height = img.height;
                drawRegionsOnCanvas();
            };
            img.src = templateImage;
        }
    }, [templateImage, drawRegionsOnCanvas]);

    const saveTemplate = () => {
        const newTemplate: TemplateSettings = {
            referenceImage: templateImage ?? undefined,
            regions,
        };
        setTemplateSettings(newTemplate);
        saveSettings(undefined, newTemplate);
        setShowTemplateEditor(false);
    };

    // Pending cards management
    const removePendingCard = (id: string) => {
        setPendingCards((prev) => prev.filter((p) => p.id !== id));
    };

    const updatePendingCardCondition = (id: string, condition: ConditionKey) => {
        setPendingCards((prev) =>
            prev.map((p) => (p.id === id ? { ...p, condition } : p))
        );
    };

    const updatePendingCardFoiling = (id: string, foiling: FoilingKey | null) => {
        setPendingCards((prev) =>
            prev.map((p) => (p.id === id ? { ...p, foiling } : p))
        );
    };

    const updatePendingCardLanguage = (id: string, language: LanguageKey) => {
        setPendingCards((prev) =>
            prev.map((p) => (p.id === id ? { ...p, language } : p))
        );
    };

    const replacePendingCardManually = (id: string, card: CardMatch) => {
        setPendingCards((prev) =>
            prev.map((p) => (p.id === id ? { ...p, card, capturedAt: new Date() } : p))
        );
        setSearchQuery('');
        setSearchResults([]);
    };

    const rescanPendingCard = (id: string) => {
        setReplacingCardId(id);
        // Camera will capture and replace when match comes in
    };

    const confirmAllPendingCards = async () => {
        if (!selectedLotId || pendingCards.length === 0) return;

        setConfirmingAll(true);

        // Send all cards to backend one by one
        for (const pending of pendingCards) {
            const confirmData: Record<string, unknown> = {
                lot_id: selectedLotId,
                condition: pending.condition,
                language: pending.language,
            };

            if (pending.card.is_custom) {
                confirmData.custom_printing_id = pending.card.id;
                confirmData.is_custom = true;
            } else {
                confirmData.fab_printing_id = pending.card.id;
            }

            await new Promise<void>((resolve) => {
                router.post('/fab/scanner/confirm', confirmData, {
                    preserveState: true,
                    preserveScroll: true,
                    onFinish: () => resolve(),
                });
            });
        }

        setPendingCards([]);
        setConfirmingAll(false);
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

            // Get camera track and capabilities
            const videoTrack = stream.getVideoTracks()[0];
            trackRef.current = videoTrack;

            // Get capabilities (with type assertion for advanced features)
            const capabilities = videoTrack.getCapabilities() as MediaTrackCapabilities & {
                zoom?: { min: number; max: number; step: number };
                focusMode?: string[];
                focusDistance?: { min: number; max: number; step: number };
                exposureMode?: string[];
                exposureTime?: { min: number; max: number; step: number };
                brightness?: { min: number; max: number; step: number };
                contrast?: { min: number; max: number; step: number };
                sharpness?: { min: number; max: number; step: number };
                saturation?: { min: number; max: number; step: number };
                torch?: boolean;
            };

            setCameraCapabilities({
                zoom: capabilities.zoom,
                focusMode: capabilities.focusMode,
                focusDistance: capabilities.focusDistance,
                exposureMode: capabilities.exposureMode,
                exposureTime: capabilities.exposureTime,
                brightness: capabilities.brightness,
                contrast: capabilities.contrast,
                sharpness: capabilities.sharpness,
                saturation: capabilities.saturation,
                torch: capabilities.torch,
            });

            // Set initial values from current settings
            const currentSettings = videoTrack.getSettings() as MediaTrackSettings & {
                focusDistance?: number;
                brightness?: number;
                contrast?: number;
                sharpness?: number;
                saturation?: number;
                exposureTime?: number;
            };

            setCameraSettings(prev => ({
                ...prev,
                focusDistance: currentSettings.focusDistance ?? prev.focusDistance,
                brightness: currentSettings.brightness ?? prev.brightness,
                contrast: currentSettings.contrast ?? prev.contrast,
                sharpness: currentSettings.sharpness ?? prev.sharpness,
                saturation: currentSettings.saturation ?? prev.saturation,
                exposureTime: currentSettings.exposureTime ?? prev.exposureTime,
            }));

            console.log('Camera capabilities:', capabilities);
            console.log('Current settings:', currentSettings);

            // Wait for next tick so video element is rendered
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
                focusMode?: string;
                focusDistance?: number;
                exposureMode?: string;
                exposureTime?: number;
                brightness?: number;
                contrast?: number;
                sharpness?: number;
                saturation?: number;
                torch?: boolean;
            };

            const constraints: MediaTrackConstraints & { advanced?: AdvancedConstraint[] } = {
                advanced: [{}],
            };

            const adv = constraints.advanced![0];

            if (setting.zoom !== undefined && cameraCapabilities.zoom) adv.zoom = setting.zoom;
            if (setting.focusMode !== undefined && cameraCapabilities.focusMode) adv.focusMode = setting.focusMode;
            if (setting.focusDistance !== undefined && cameraCapabilities.focusDistance) adv.focusDistance = setting.focusDistance;
            if (setting.exposureMode !== undefined && cameraCapabilities.exposureMode) adv.exposureMode = setting.exposureMode;
            if (setting.exposureTime !== undefined && cameraCapabilities.exposureTime) adv.exposureTime = setting.exposureTime;
            if (setting.brightness !== undefined && cameraCapabilities.brightness) adv.brightness = setting.brightness;
            if (setting.contrast !== undefined && cameraCapabilities.contrast) adv.contrast = setting.contrast;
            if (setting.sharpness !== undefined && cameraCapabilities.sharpness) adv.sharpness = setting.sharpness;
            if (setting.saturation !== undefined && cameraCapabilities.saturation) adv.saturation = setting.saturation;
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

        // Wait for video to be ready if dimensions are 0
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
        router.post('/fab/scanner/recognize', { image: base64 }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setRecognizing(false),
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Process files one by one
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;

            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.readAsDataURL(file);
            });

            setRecognizing(true);
            router.post('/fab/scanner/recognize', { image: base64 }, {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setRecognizing(false),
            });
        }

        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const handleConfirm = useCallback(() => {
        if (!selectedCard || !selectedLotId) return;

        setConfirming(true);

        const confirmData: Record<string, unknown> = {
            lot_id: selectedLotId,
            condition: selectedCondition,
            language: selectedLanguage,
        };

        if (selectedCard.is_custom) {
            confirmData.custom_printing_id = selectedCard.id;
            confirmData.is_custom = true;
        } else {
            confirmData.fab_printing_id = selectedCard.id;
        }

        router.post('/fab/scanner/confirm', confirmData, {
            preserveState: true,
            preserveScroll: true,
        });
    }, [selectedCard, selectedLotId, selectedCondition, selectedLanguage]);

    const handleCreateLot = () => {
        setCreatingLot(true);
        router.post('/fab/scanner/lot', {
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
            <Head title="FaB Scanner" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Kartenscanner</h1>
                        <p className="text-muted-foreground">
                            Scanne Karten für dein Inventar
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTemplateEditor(true)}
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Template
                        </Button>
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
                            <CardContent className="space-y-2">
                                <div className="relative">
                                    <Input
                                        ref={searchInputRef}
                                        placeholder="Kartenname oder Nummer..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                    />
                                    {searching && (
                                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
                                    )}
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="max-h-64 overflow-y-auto rounded-lg border">
                                        {searchResults.map((result, index) => (
                                            <div
                                                key={result.id}
                                                className={`flex cursor-pointer items-center gap-3 p-2 hover:bg-muted ${index === selectedResultIndex ? 'bg-muted' : ''}`}
                                                onClick={() => {
                                                    setSelectedCard(result);
                                                    setSearchQuery('');
                                                    setSearchResults([]);
                                                }}
                                            >
                                                <CardImage
                                                    src={result.image_url}
                                                    alt={result.card_name}
                                                    className="h-12 w-9 rounded object-cover"
                                                    placeholderClassName="h-12 w-9 rounded"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium flex items-center gap-1">
                                                        {result.card_name}
                                                        {result.is_custom && (
                                                            <Badge variant="secondary" className="text-[10px] px-1">Custom</Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">
                                                        {result.set_name} - {result.collector_number}
                                                    </div>
                                                </div>
                                                {result.rarity && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {getRarityLabel(result.rarity)}
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Scan Settings - Always visible */}
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
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Foiling</Label>
                                        <Select
                                            value={selectedFoiling ?? 'none'}
                                            onValueChange={(v) => setSelectedFoiling(v === 'none' ? null : v as FoilingKey)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Von Karte</SelectItem>
                                                {Object.entries(FOILINGS).map(([key, label]) => (
                                                    <SelectItem key={key} value={key}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Sprache</Label>
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
                            </CardContent>
                        </Card>

                        {/* Camera */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Camera className="h-5 w-5" />
                                    Karte scannen
                                </CardTitle>
                                <CardDescription>
                                    Kamera oder Bild-Upload für KI-Erkennung
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {showCamera ? (
                                    <div className="space-y-2">
                                        <div className="relative overflow-hidden rounded-lg bg-black">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full"
                                                style={{ transform: 'scaleX(-1)' }}
                                                onLoadedMetadata={(e) => {
                                                    const video = e.currentTarget;
                                                    video.play().catch((err) => console.error('Play failed:', err));
                                                }}
                                                onCanPlay={() => setVideoReady(true)}
                                            />
                                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                <div
                                                    className="rounded-lg border-2 border-dashed border-white/70"
                                                    style={{
                                                        width: '60%',
                                                        aspectRatio: '63 / 88',
                                                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                                                    }}
                                                />
                                            </div>
                                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                <div
                                                    className="relative"
                                                    style={{
                                                        width: '60%',
                                                        aspectRatio: '63 / 88',
                                                    }}
                                                >
                                                    <div className="absolute top-0 left-0 h-6 w-6 border-t-4 border-l-4 border-green-400 rounded-tl" />
                                                    <div className="absolute top-0 right-0 h-6 w-6 border-t-4 border-r-4 border-green-400 rounded-tr" />
                                                    <div className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-green-400 rounded-bl" />
                                                    <div className="absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 border-green-400 rounded-br" />
                                                </div>
                                            </div>
                                            {recognizing && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                    <div className="flex flex-col items-center gap-2 text-white">
                                                        <Loader2 className="h-8 w-8 animate-spin" />
                                                        <span>Erkenne Karte...</span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Bulk Scan Countdown Overlay */}
                                            {bulkScanRunning && (
                                                <div className="pointer-events-none absolute inset-0">
                                                    {/* Countdown in center */}
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="flex flex-col items-center">
                                                            <span
                                                                className="text-8xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                                                                style={{
                                                                    textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)',
                                                                    opacity: bulkCountdown <= 2 ? 1 : 0.7
                                                                }}
                                                            >
                                                                {bulkCountdown}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Card count in top right */}
                                                    <div className="absolute top-2 right-2 rounded-lg bg-black/70 px-3 py-1.5 text-white">
                                                        <span className="text-lg font-bold">{pendingCards.length}</span>
                                                        <span className="text-sm ml-1">Karten</span>
                                                    </div>
                                                    {/* Progress bar at bottom */}
                                                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
                                                        <div
                                                            className="h-full bg-green-500 transition-all duration-1000 ease-linear"
                                                            style={{
                                                                width: `${((bulkMode.interval - bulkCountdown) / bulkMode.interval) * 100}%`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-center text-xs">
                                            Karte im Rahmen positionieren
                                        </p>

                                        {/* Camera Settings Panel */}
                                        {showCameraSettings && (
                                            <div className="space-y-3 rounded-lg border bg-muted/30 p-3 max-h-64 overflow-y-auto">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Kamera-Einstellungen</span>
                                                </div>

                                                {/* Focus Mode */}
                                                {cameraCapabilities.focusMode && cameraCapabilities.focusMode.length > 1 && (
                                                    <div className="space-y-1">
                                                        <span className="text-sm">Fokus-Modus</span>
                                                        <div className="flex gap-1">
                                                            {cameraCapabilities.focusMode.map((mode) => (
                                                                <Button
                                                                    key={mode}
                                                                    size="sm"
                                                                    variant={cameraSettings.focusMode === mode ? 'default' : 'outline'}
                                                                    onClick={() => applyCameraSetting({ focusMode: mode })}
                                                                    className="flex-1 text-xs"
                                                                >
                                                                    {mode === 'continuous' ? 'Auto' : mode === 'manual' ? 'Manuell' : mode}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Focus Distance (only when manual) */}
                                                {cameraCapabilities.focusDistance && cameraSettings.focusMode === 'manual' && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span>Fokus-Distanz</span>
                                                            <span className="text-muted-foreground">{cameraSettings.focusDistance}</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={cameraCapabilities.focusDistance.min}
                                                            max={cameraCapabilities.focusDistance.max}
                                                            step={cameraCapabilities.focusDistance.step}
                                                            value={cameraSettings.focusDistance}
                                                            onChange={(e) => applyCameraSetting({ focusDistance: parseFloat(e.target.value) })}
                                                            className="w-full accent-primary"
                                                        />
                                                    </div>
                                                )}

                                                {/* Sharpness */}
                                                {cameraCapabilities.sharpness && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span>Schärfe</span>
                                                            <span className="text-muted-foreground">{cameraSettings.sharpness}</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={cameraCapabilities.sharpness.min}
                                                            max={cameraCapabilities.sharpness.max}
                                                            step={cameraCapabilities.sharpness.step}
                                                            value={cameraSettings.sharpness}
                                                            onChange={(e) => applyCameraSetting({ sharpness: parseFloat(e.target.value) })}
                                                            className="w-full accent-primary"
                                                        />
                                                    </div>
                                                )}

                                                {/* Brightness */}
                                                {cameraCapabilities.brightness && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span>Helligkeit</span>
                                                            <span className="text-muted-foreground">{cameraSettings.brightness}</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={cameraCapabilities.brightness.min}
                                                            max={cameraCapabilities.brightness.max}
                                                            step={cameraCapabilities.brightness.step}
                                                            value={cameraSettings.brightness}
                                                            onChange={(e) => applyCameraSetting({ brightness: parseFloat(e.target.value) })}
                                                            className="w-full accent-primary"
                                                        />
                                                    </div>
                                                )}

                                                {/* Contrast */}
                                                {cameraCapabilities.contrast && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span>Kontrast</span>
                                                            <span className="text-muted-foreground">{cameraSettings.contrast}</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={cameraCapabilities.contrast.min}
                                                            max={cameraCapabilities.contrast.max}
                                                            step={cameraCapabilities.contrast.step}
                                                            value={cameraSettings.contrast}
                                                            onChange={(e) => applyCameraSetting({ contrast: parseFloat(e.target.value) })}
                                                            className="w-full accent-primary"
                                                        />
                                                    </div>
                                                )}

                                                {/* Saturation */}
                                                {cameraCapabilities.saturation && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span>Sättigung</span>
                                                            <span className="text-muted-foreground">{cameraSettings.saturation}</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={cameraCapabilities.saturation.min}
                                                            max={cameraCapabilities.saturation.max}
                                                            step={cameraCapabilities.saturation.step}
                                                            value={cameraSettings.saturation}
                                                            onChange={(e) => applyCameraSetting({ saturation: parseFloat(e.target.value) })}
                                                            className="w-full accent-primary"
                                                        />
                                                    </div>
                                                )}

                                                {/* Exposure Mode */}
                                                {cameraCapabilities.exposureMode && cameraCapabilities.exposureMode.length > 1 && (
                                                    <div className="space-y-1">
                                                        <span className="text-sm">Belichtung</span>
                                                        <div className="flex gap-1">
                                                            {cameraCapabilities.exposureMode.map((mode) => (
                                                                <Button
                                                                    key={mode}
                                                                    size="sm"
                                                                    variant={cameraSettings.exposureMode === mode ? 'default' : 'outline'}
                                                                    onClick={() => applyCameraSetting({ exposureMode: mode })}
                                                                    className="flex-1 text-xs"
                                                                >
                                                                    {mode === 'continuous' ? 'Auto' : mode === 'manual' ? 'Manuell' : mode}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Exposure Time (only when manual) */}
                                                {cameraCapabilities.exposureTime && cameraSettings.exposureMode === 'manual' && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span>Belichtungszeit</span>
                                                            <span className="text-muted-foreground">{cameraSettings.exposureTime}</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={cameraCapabilities.exposureTime.min}
                                                            max={cameraCapabilities.exposureTime.max}
                                                            step={cameraCapabilities.exposureTime.step}
                                                            value={cameraSettings.exposureTime}
                                                            onChange={(e) => applyCameraSetting({ exposureTime: parseFloat(e.target.value) })}
                                                            className="w-full accent-primary"
                                                        />
                                                    </div>
                                                )}

                                                {/* Zoom */}
                                                {cameraCapabilities.zoom && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="flex items-center gap-1">
                                                                <ZoomIn className="h-3 w-3" />
                                                                Zoom
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {cameraSettings.zoom.toFixed(1)}x
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={cameraCapabilities.zoom.min}
                                                            max={cameraCapabilities.zoom.max}
                                                            step={cameraCapabilities.zoom.step}
                                                            value={cameraSettings.zoom}
                                                            onChange={(e) => applyCameraSetting({ zoom: parseFloat(e.target.value) })}
                                                            className="w-full accent-primary"
                                                        />
                                                    </div>
                                                )}

                                                {/* Torch */}
                                                {cameraCapabilities.torch && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="flex items-center gap-1 text-sm">
                                                            <Flashlight className="h-3 w-3" />
                                                            Taschenlampe
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant={cameraSettings.torch ? 'default' : 'outline'}
                                                            onClick={() => applyCameraSetting({ torch: !cameraSettings.torch })}
                                                        >
                                                            {cameraSettings.torch ? 'An' : 'Aus'}
                                                        </Button>
                                                    </div>
                                                )}

                                                {!cameraCapabilities.zoom && !cameraCapabilities.torch && !cameraCapabilities.sharpness && !cameraCapabilities.brightness && (!cameraCapabilities.focusMode || cameraCapabilities.focusMode.length <= 1) && (
                                                    <p className="text-muted-foreground text-xs">
                                                        Diese Kamera unterstützt keine erweiterten Einstellungen.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={capturePhoto}
                                                disabled={recognizing || !videoReady}
                                                className="flex-1"
                                            >
                                                {recognizing ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : !videoReady ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Camera className="mr-2 h-4 w-4" />
                                                )}
                                                {recognizing ? 'Erkenne...' : !videoReady ? 'Kamera lädt...' : 'Aufnehmen'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setShowCameraSettings(!showCameraSettings)}
                                                title="Kamera-Einstellungen"
                                            >
                                                <Settings2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" onClick={stopCamera}>
                                                Abbrechen
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={startCamera}
                                            disabled={!ollamaStatus.available}
                                            className="w-full"
                                        >
                                            <Camera className="mr-2 h-4 w-4" />
                                            Kamera starten
                                        </Button>
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <Button
                                                    variant="outline"
                                                    disabled={!ollamaStatus.available}
                                                    className="w-full"
                                                    onClick={() => document.getElementById('file-single')?.click()}
                                                >
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Bild
                                                </Button>
                                                <input
                                                    id="file-single"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                />
                                            </div>
                                            <div className="flex-1 relative">
                                                <Button
                                                    variant="outline"
                                                    disabled={!ollamaStatus.available}
                                                    className="w-full"
                                                    onClick={() => document.getElementById('file-multiple')?.click()}
                                                >
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Mehrere
                                                </Button>
                                                <input
                                                    id="file-multiple"
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                />
                                            </div>
                                            <div className="flex-1 relative">
                                                <Button
                                                    variant="outline"
                                                    disabled={!ollamaStatus.available}
                                                    className="w-full"
                                                    onClick={() => document.getElementById('file-folder')?.click()}
                                                >
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Ordner
                                                </Button>
                                                <input
                                                    id="file-folder"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                    {...{ webkitdirectory: '', directory: '' } as any}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Bulk Mode Settings */}
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
                                            const newBulkMode = { ...bulkMode, enabled: checked };
                                            setBulkMode(newBulkMode);
                                            saveSettings(newBulkMode);
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
                                                    const newBulkMode = { ...bulkMode, interval: parseInt(v) };
                                                    setBulkMode(newBulkMode);
                                                    saveSettings(newBulkMode);
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
                                        <p className="text-sm text-muted-foreground">
                                            Nutzt Einstellungen von oben
                                        </p>
                                    </div>
                                    {showCamera && (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={bulkScanRunning ? stopBulkScan : startBulkScan}
                                                className="flex-1"
                                                variant={bulkScanRunning ? 'destructive' : 'default'}
                                                disabled={!videoReady}
                                            >
                                                {bulkScanRunning ? (
                                                    <>
                                                        <Pause className="mr-2 h-4 w-4" />
                                                        Stoppen
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="mr-2 h-4 w-4" />
                                                        Bulk-Scan starten
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                    {replacingCardId && (
                                        <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-3 dark:bg-yellow-950">
                                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                                Scanne jetzt um Karte zu ersetzen...
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => setReplacingCardId(null)}
                                            >
                                                Abbrechen
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    </div>

                    {/* Right: Selected Card & Confirmation */}
                    <div className="space-y-4">
                        {/* Selected Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Ausgewählte Karte</CardTitle>
                                <CardDescription>
                                    1-5 für Zustand, Enter zum Bestätigen, Escape zum Abbrechen
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {selectedCard ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <CardImage
                                                src={selectedCard.image_url}
                                                alt={selectedCard.card_name}
                                                className="h-48 w-36 rounded-lg shadow object-cover"
                                                placeholderClassName="h-48 w-36 rounded-lg"
                                            />
                                            <div className="flex-1 space-y-2">
                                                <h3 className="text-xl font-bold flex items-center gap-2">
                                                    {selectedCard.card_name}
                                                    {selectedCard.is_custom && (
                                                        <Badge variant="secondary" className="text-xs">Custom</Badge>
                                                    )}
                                                </h3>
                                                <p className="text-muted-foreground">
                                                    {selectedCard.set_name} - {selectedCard.collector_number}
                                                </p>
                                                <div className="flex gap-2">
                                                    {selectedCard.rarity && (
                                                        <Badge variant="outline">
                                                            {getRarityLabel(selectedCard.rarity)}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="secondary">
                                                        {getFoilingLabel(selectedCard.foiling)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Condition Selection */}
                                        <div className="space-y-2">
                                            <Label>Zustand (1-5)</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {(Object.entries(CONDITIONS) as [ConditionKey, string][]).map(([key, label], index) => (
                                                    <Button
                                                        key={key}
                                                        variant={selectedCondition === key ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setSelectedCondition(key)}
                                                        className="flex-1"
                                                    >
                                                        <span className="mr-1 text-xs opacity-60">{index + 1}</span>
                                                        {label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Confirm Button */}
                                        <Button
                                            onClick={handleConfirm}
                                            disabled={confirming || !selectedLotId}
                                            className="w-full"
                                        >
                                            {confirming ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                            )}
                                            Zum Inventar hinzufügen (Enter)
                                        </Button>
                                    </div>
                                ) : notFoundRecognition ? (
                                    <div className="space-y-4">
                                        <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950">
                                            <div className="flex items-start gap-3">
                                                <XCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                                                        Karte nicht in Datenbank
                                                    </h4>
                                                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                                        Die KI hat die Karte erkannt, aber sie wurde nicht in der Kartendatenbank gefunden.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm">Erkannte Daten:</h4>
                                            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
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
                                                        handleSearchChange(query);
                                                        setNotFoundRecognition(null);
                                                        searchInputRef.current?.focus();
                                                    }}
                                                >
                                                    <Search className="mr-2 h-4 w-4" />
                                                    Manuell suchen
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        // Pre-fill form with recognition data
                                                        setCustomCardForm({
                                                            name: notFoundRecognition?.card_name ?? '',
                                                            set_name: notFoundRecognition?.set_code ?? '',
                                                            collector_number: notFoundRecognition?.collector_number ?? '',
                                                            rarity: '',
                                                            foiling: notFoundRecognition?.foiling ?? '',
                                                            language: 'DE',
                                                            linked_fab_card_id: null,
                                                            linked_fab_card_name: '',
                                                            linked_fab_card_pitch: null,
                                                            linked_fab_card_collector_number: null,
                                                        });
                                                        setFabCardSearchQuery('');
                                                        setFabCardSearchResults([]);
                                                        setShowCustomCardDialog(true);
                                                    }}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Als eigene Karte
                                                </Button>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => setNotFoundRecognition(null)}
                                            >
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

                        {/* Pending Cards (Bulk Mode) */}
                        {bulkMode.enabled && pendingCards.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center justify-between">
                                        <span>Warteschlange</span>
                                        <Badge variant="secondary">{pendingCards.length}</Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        Karten vor dem Hinzufügen prüfen
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="max-h-64 space-y-2 overflow-y-auto">
                                        {pendingCards.map((pending, index) => (
                                            <div
                                                key={pending.id}
                                                className={`flex items-start gap-3 rounded-lg border p-2 ${
                                                    replacingCardId === pending.id ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''
                                                }`}
                                            >
                                                <CardImage
                                                    src={pending.card.image_url}
                                                    alt={pending.card.card_name}
                                                    className="h-16 w-12 rounded object-cover"
                                                    placeholderClassName="h-16 w-12 rounded"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate flex items-center gap-1">
                                                        {pending.card.card_name}
                                                        {pending.card.is_custom && (
                                                            <Badge variant="secondary" className="text-[10px] px-1 shrink-0">Custom</Badge>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {pending.card.set_name} - {pending.card.collector_number}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        <Select
                                                            value={pending.condition}
                                                            onValueChange={(v) => updatePendingCardCondition(pending.id, v as ConditionKey)}
                                                        >
                                                            <SelectTrigger className="h-6 w-16 text-xs">
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
                                                        <Select
                                                            value={pending.foiling ?? pending.card.foiling ?? 'S'}
                                                            onValueChange={(v) => updatePendingCardFoiling(pending.id, v as FoilingKey)}
                                                        >
                                                            <SelectTrigger className="h-6 w-20 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Object.entries(FOILINGS).map(([key, label]) => (
                                                                    <SelectItem key={key} value={key}>
                                                                        {label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Select
                                                            value={pending.language}
                                                            onValueChange={(v) => updatePendingCardLanguage(pending.id, v as LanguageKey)}
                                                        >
                                                            <SelectTrigger className="h-6 w-14 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Object.entries(LANGUAGES).map(([key, label]) => (
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
                                                        onClick={() => rescanPendingCard(pending.id)}
                                                        title="Neu scannen"
                                                    >
                                                        <Camera className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-destructive hover:text-destructive"
                                                        onClick={() => removePendingCard(pending.id)}
                                                        title="Entfernen"
                                                    >
                                                        <XCircle className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            onClick={confirmAllPendingCards}
                                            disabled={confirmingAll || !selectedLotId}
                                            className="flex-1"
                                        >
                                            {confirmingAll ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                            )}
                                            Alle bestätigen ({pendingCards.length})
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setPendingCards([])}
                                            disabled={confirmingAll}
                                        >
                                            Leeren
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Scanned Cards in Lot */}
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
                                            {scannedCards.slice(0, 10).map((card) => (
                                                <TableRow key={card.id}>
                                                    <TableCell>{card.position}</TableCell>
                                                    <TableCell>{card.card_name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{card.condition}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="py-4 text-center text-muted-foreground">
                                        Noch keine Karten in diesem Lot
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Create Lot Dialog */}
            <Dialog open={showCreateLot} onOpenChange={setShowCreateLot}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Neues Lot erstellen</DialogTitle>
                        <DialogDescription>
                            Erstelle ein neues Lot für deine Scan-Session
                        </DialogDescription>
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
                            {creatingLot ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-2 h-4 w-4" />
                            )}
                            Lot erstellen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Template Editor Dialog */}
            <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Karten-Template konfigurieren</DialogTitle>
                        <DialogDescription>
                            Lade ein Referenzbild und markiere die Bereiche für Kartenname, Set-Code und Kartennummer
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Referenzbild</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => document.getElementById('template-upload')?.click()}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Bild hochladen
                                </Button>
                                <input
                                    id="template-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleTemplateImageUpload}
                                />
                                {templateImage && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setTemplateImage(null);
                                            setRegions({});
                                        }}
                                    >
                                        Entfernen
                                    </Button>
                                )}
                            </div>
                        </div>

                        {templateImage && (
                            <>
                                <div className="space-y-2">
                                    <Label>Region markieren</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={drawingRegion === 'cardName' ? 'default' : 'outline'}
                                            onClick={() => setDrawingRegion('cardName')}
                                            className="flex-1"
                                        >
                                            <span className="mr-2 inline-block h-3 w-3 rounded-full bg-red-500" />
                                            Kartenname
                                            {regions.cardName && <CheckCircle className="ml-2 h-4 w-4" />}
                                        </Button>
                                        <Button
                                            variant={drawingRegion === 'setCode' ? 'default' : 'outline'}
                                            onClick={() => setDrawingRegion('setCode')}
                                            className="flex-1"
                                        >
                                            <span className="mr-2 inline-block h-3 w-3 rounded-full bg-green-500" />
                                            Set-Code
                                            {regions.setCode && <CheckCircle className="ml-2 h-4 w-4" />}
                                        </Button>
                                        <Button
                                            variant={drawingRegion === 'collectorNumber' ? 'default' : 'outline'}
                                            onClick={() => setDrawingRegion('collectorNumber')}
                                            className="flex-1"
                                        >
                                            <span className="mr-2 inline-block h-3 w-3 rounded-full bg-blue-500" />
                                            Nummer
                                            {regions.collectorNumber && <CheckCircle className="ml-2 h-4 w-4" />}
                                        </Button>
                                    </div>
                                    {drawingRegion && (
                                        <p className="text-sm text-muted-foreground">
                                            Ziehe ein Rechteck auf dem Bild um den Bereich &quot;{drawingRegion === 'cardName' ? 'Kartenname' : drawingRegion === 'setCode' ? 'Set-Code' : 'Nummer'}&quot; zu markieren
                                        </p>
                                    )}
                                </div>

                                <div className="relative overflow-hidden rounded-lg border">
                                    <canvas
                                        ref={templateCanvasRef}
                                        className={`max-h-96 w-full object-contain ${drawingRegion ? 'cursor-crosshair' : ''}`}
                                        onMouseDown={handleCanvasMouseDown}
                                        onMouseUp={handleCanvasMouseUp}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTemplateEditor(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={saveTemplate} disabled={!templateImage}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Speichern
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Custom Card Dialog */}
            <Dialog open={showCustomCardDialog} onOpenChange={setShowCustomCardDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Eigene Karte anlegen</DialogTitle>
                        <DialogDescription>
                            Lege eine eigene Karte an, die nicht in der Datenbank vorhanden ist.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="space-y-2">
                            <Label htmlFor="custom-card-name">Kartenname (wie auf der Karte) *</Label>
                            <Input
                                id="custom-card-name"
                                value={customCardForm.name}
                                onChange={(e) => setCustomCardForm({ ...customCardForm, name: e.target.value })}
                                placeholder="z.B. 'Realitätsbrechung'"
                            />
                        </div>

                        {/* Link to main card */}
                        <div className="space-y-2">
                            <Label>Hauptkarte verknüpfen (optional)</Label>
                            <p className="text-xs text-muted-foreground">
                                Wenn dies eine Übersetzung/Variante einer existierenden Karte ist
                            </p>
                            {customCardForm.linked_fab_card_id ? (
                                <div className="flex items-center gap-2 p-2 rounded border bg-muted/50">
                                    <span
                                        className={`inline-block h-3 w-3 rounded-full shrink-0 ${
                                            getPitchColor(customCardForm.linked_fab_card_pitch) === 'red'
                                                ? 'bg-red-500'
                                                : getPitchColor(customCardForm.linked_fab_card_pitch) === 'yellow'
                                                  ? 'bg-yellow-500'
                                                  : getPitchColor(customCardForm.linked_fab_card_pitch) === 'blue'
                                                    ? 'bg-blue-500'
                                                    : 'bg-gray-400'
                                        }`}
                                    />
                                    <span className="flex-1 text-sm">
                                        {customCardForm.linked_fab_card_name}
                                        {customCardForm.linked_fab_card_collector_number && (
                                            <span className="text-muted-foreground ml-1">
                                                ({customCardForm.linked_fab_card_collector_number})
                                            </span>
                                        )}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCustomCardForm({
                                            ...customCardForm,
                                            linked_fab_card_id: null,
                                            linked_fab_card_name: '',
                                            linked_fab_card_pitch: null,
                                            linked_fab_card_collector_number: null,
                                        })}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        value={fabCardSearchQuery}
                                        onChange={async (e) => {
                                            setFabCardSearchQuery(e.target.value);
                                            if (e.target.value.length >= 2) {
                                                setSearchingFabCards(true);
                                                try {
                                                    const res = await fetch(`/custom-cards/fab-cards/search?q=${encodeURIComponent(e.target.value)}`);
                                                    const data = await res.json();
                                                    setFabCardSearchResults(data);
                                                } catch {
                                                    setFabCardSearchResults([]);
                                                } finally {
                                                    setSearchingFabCards(false);
                                                }
                                            } else {
                                                setFabCardSearchResults([]);
                                            }
                                        }}
                                        placeholder="Suche nach englischem Kartennamen..."
                                    />
                                    {fabCardSearchResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {fabCardSearchResults.map((card) => {
                                                const pitchColor = getPitchColor(card.pitch);
                                                return (
                                                    <button
                                                        key={card.id}
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                                                        onClick={() => {
                                                            setCustomCardForm({
                                                                ...customCardForm,
                                                                linked_fab_card_id: card.id,
                                                                linked_fab_card_name: card.name,
                                                                linked_fab_card_pitch: card.pitch,
                                                                linked_fab_card_collector_number: card.collector_number,
                                                            });
                                                            setFabCardSearchQuery('');
                                                            setFabCardSearchResults([]);
                                                            setHoveredFabCard(null);
                                                        }}
                                                        onMouseEnter={() => setHoveredFabCard(card)}
                                                        onMouseLeave={() => setHoveredFabCard(null)}
                                                    >
                                                        <span
                                                            className={`inline-block h-3 w-3 rounded-full shrink-0 ${
                                                                pitchColor === 'red'
                                                                    ? 'bg-red-500'
                                                                    : pitchColor === 'yellow'
                                                                      ? 'bg-yellow-500'
                                                                      : pitchColor === 'blue'
                                                                        ? 'bg-blue-500'
                                                                        : 'bg-gray-400'
                                                            }`}
                                                        />
                                                        <span className="flex-1">{card.name}</span>
                                                        {card.collector_number && (
                                                            <span className="text-muted-foreground text-xs">
                                                                {card.collector_number}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {/* Image preview on hover */}
                                    {hoveredFabCard?.image_url && (
                                        <div className="absolute right-0 top-full mt-1 z-20 pointer-events-none">
                                            <img
                                                src={hoveredFabCard.image_url}
                                                alt="Vorschau"
                                                className="h-48 w-auto rounded-lg shadow-xl border"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="custom-card-set">Set</Label>
                                <Input
                                    id="custom-card-set"
                                    value={customCardForm.set_name}
                                    onChange={(e) => setCustomCardForm({ ...customCardForm, set_name: e.target.value })}
                                    placeholder="z.B. '2HP' oder 'History Pack 2'"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="custom-card-number">Kartennummer</Label>
                                <Input
                                    id="custom-card-number"
                                    value={customCardForm.collector_number}
                                    onChange={(e) => setCustomCardForm({ ...customCardForm, collector_number: e.target.value })}
                                    placeholder="z.B. '154'"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="custom-card-language">Sprache</Label>
                                <Select
                                    value={customCardForm.language}
                                    onValueChange={(v) => setCustomCardForm({ ...customCardForm, language: v })}
                                >
                                    <SelectTrigger id="custom-card-language">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DE">Deutsch</SelectItem>
                                        <SelectItem value="EN">Englisch</SelectItem>
                                        <SelectItem value="FR">Französisch</SelectItem>
                                        <SelectItem value="ES">Spanisch</SelectItem>
                                        <SelectItem value="IT">Italienisch</SelectItem>
                                        <SelectItem value="JP">Japanisch</SelectItem>
                                        <SelectItem value="CN">Chinesisch</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="custom-card-rarity">Seltenheit</Label>
                                <Select
                                    value={customCardForm.rarity}
                                    onValueChange={(v) => setCustomCardForm({ ...customCardForm, rarity: v })}
                                >
                                    <SelectTrigger id="custom-card-rarity">
                                        <SelectValue placeholder="..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="C">Common</SelectItem>
                                        <SelectItem value="R">Rare</SelectItem>
                                        <SelectItem value="S">Super Rare</SelectItem>
                                        <SelectItem value="M">Majestic</SelectItem>
                                        <SelectItem value="L">Legendary</SelectItem>
                                        <SelectItem value="F">Fabled</SelectItem>
                                        <SelectItem value="P">Promo</SelectItem>
                                        <SelectItem value="T">Token</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="custom-card-foiling">Foiling</Label>
                                <Select
                                    value={customCardForm.foiling}
                                    onValueChange={(v) => setCustomCardForm({ ...customCardForm, foiling: v })}
                                >
                                    <SelectTrigger id="custom-card-foiling">
                                        <SelectValue placeholder="..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(FOILINGS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCustomCardDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button
                            onClick={() => {
                                if (!customCardForm.name.trim()) {
                                    alert('Bitte gib einen Kartennamen ein.');
                                    return;
                                }

                                setCreatingCustomCard(true);
                                router.post('/custom-cards', {
                                    game_id: 1, // FAB game ID
                                    linked_fab_card_id: customCardForm.linked_fab_card_id,
                                    name: customCardForm.name,
                                    set_name: customCardForm.set_name || null,
                                    collector_number: customCardForm.collector_number || null,
                                    rarity: customCardForm.rarity || null,
                                    foiling: customCardForm.foiling || null,
                                    language: customCardForm.language,
                                }, {
                                    preserveState: true,
                                    preserveScroll: true,
                                    onSuccess: (page) => {
                                        const flash = page.props.flash as { customCard?: {
                                            id: number;
                                            card_name: string;
                                            set_name: string | null;
                                            collector_number: string | null;
                                            rarity: string | null;
                                            foiling: string | null;
                                        } };
                                        const customCard = flash?.customCard;

                                        if (customCard) {
                                            setSelectedCard({
                                                id: customCard.id,
                                                card_name: customCard.card_name,
                                                set_name: customCard.set_name ?? 'Custom',
                                                collector_number: customCard.collector_number ?? '-',
                                                rarity: customCard.rarity,
                                                foiling: customCard.foiling,
                                                image_url: null,
                                                is_custom: true,
                                            });
                                            toast.success(`Karte "${customCard.card_name}" erstellt`);
                                        } else {
                                            // Card was created but no flash data - still show success
                                            toast.success(`Karte "${customCardForm.name}" erstellt`);
                                        }

                                        setShowCustomCardDialog(false);
                                        setNotFoundRecognition(null);
                                        setCustomCardForm({
                                            name: '',
                                            set_name: '',
                                            collector_number: '',
                                            rarity: '',
                                            foiling: '',
                                            language: 'DE',
                                            linked_fab_card_id: null,
                                            linked_fab_card_name: '',
                                            linked_fab_card_pitch: null,
                                            linked_fab_card_collector_number: null,
                                        });
                                        setFabCardSearchQuery('');
                                        setFabCardSearchResults([]);
                                    },
                                    onError: (errors) => {
                                        console.error('Error creating custom card:', errors);
                                        toast.error('Fehler beim Erstellen der Karte');
                                    },
                                    onFinish: () => {
                                        setCreatingCustomCard(false);
                                    },
                                });
                            }}
                            disabled={creatingCustomCard || !customCardForm.name.trim()}
                        >
                            {creatingCustomCard ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-2 h-4 w-4" />
                            )}
                            Karte anlegen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
