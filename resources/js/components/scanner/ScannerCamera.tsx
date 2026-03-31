import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Flashlight, Loader2, Pause, Play, Settings2, Upload, ZoomIn } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraCapabilities, CameraSettings, OllamaStatus } from './types';

interface ScannerCameraProps {
    ollamaStatus: OllamaStatus;
    bulkMode: { enabled: boolean; interval: number };
    pendingCardsCount: number;
    recognizing: boolean;
    onCapture: (base64: string) => void;
    onFileUpload: (files: FileList) => void;
}

export function ScannerCamera({
    ollamaStatus,
    bulkMode,
    pendingCardsCount,
    recognizing,
    onCapture,
    onFileUpload,
}: ScannerCameraProps) {
    const [showCamera, setShowCamera] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
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

    const [bulkScanRunning, setBulkScanRunning] = useState(false);
    const [bulkCountdown, setBulkCountdown] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const trackRef = useRef<MediaStreamTrack | null>(null);
    const bulkScanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const bulkCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

            const currentSettings = videoTrack.getSettings() as MediaTrackSettings & {
                focusDistance?: number;
                brightness?: number;
                contrast?: number;
                sharpness?: number;
                saturation?: number;
                exposureTime?: number;
            };

            setCameraSettings((prev) => ({
                ...prev,
                focusDistance: currentSettings.focusDistance ?? prev.focusDistance,
                brightness: currentSettings.brightness ?? prev.brightness,
                contrast: currentSettings.contrast ?? prev.contrast,
                sharpness: currentSettings.sharpness ?? prev.sharpness,
                saturation: currentSettings.saturation ?? prev.saturation,
                exposureTime: currentSettings.exposureTime ?? prev.exposureTime,
            }));

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

    const stopCamera = useCallback(() => {
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
    }, [stopBulkScan]);

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

    const capturePhoto = useCallback(() => {
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
        onCapture(base64);
    }, [onCapture]);

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
    }, [videoReady, bulkMode.interval, recognizing, capturePhoto]);

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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        onFileUpload(files);
        e.target.value = '';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Karte scannen
                </CardTitle>
                <CardDescription>Kamera oder Bild-Upload für KI-Erkennung</CardDescription>
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
                                    <div className="absolute left-0 top-0 h-6 w-6 rounded-tl border-l-4 border-t-4 border-green-400" />
                                    <div className="absolute right-0 top-0 h-6 w-6 rounded-tr border-r-4 border-t-4 border-green-400" />
                                    <div className="absolute bottom-0 left-0 h-6 w-6 rounded-bl border-b-4 border-l-4 border-green-400" />
                                    <div className="absolute bottom-0 right-0 h-6 w-6 rounded-br border-b-4 border-r-4 border-green-400" />
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
                            {bulkScanRunning && (
                                <div className="pointer-events-none absolute inset-0">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="flex flex-col items-center">
                                            <span
                                                className="text-8xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                                                style={{
                                                    textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)',
                                                    opacity: bulkCountdown <= 2 ? 1 : 0.7,
                                                }}
                                            >
                                                {bulkCountdown}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="absolute right-2 top-2 rounded-lg bg-black/70 px-3 py-1.5 text-white">
                                        <span className="text-lg font-bold">{pendingCardsCount}</span>
                                        <span className="ml-1 text-sm">Karten</span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
                                        <div
                                            className="h-full bg-green-500 transition-all duration-1000 ease-linear"
                                            style={{
                                                width: `${((bulkMode.interval - bulkCountdown) / bulkMode.interval) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="text-center text-xs text-muted-foreground">Karte im Rahmen positionieren</p>

                        {showCameraSettings && (
                            <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Kamera-Einstellungen</span>
                                </div>

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

                                {cameraCapabilities.zoom && (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-1">
                                                <ZoomIn className="h-3 w-3" />
                                                Zoom
                                            </span>
                                            <span className="text-muted-foreground">{cameraSettings.zoom.toFixed(1)}x</span>
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

                                {!cameraCapabilities.zoom &&
                                    !cameraCapabilities.torch &&
                                    !cameraCapabilities.sharpness &&
                                    !cameraCapabilities.brightness &&
                                    (!cameraCapabilities.focusMode || cameraCapabilities.focusMode.length <= 1) && (
                                        <p className="text-xs text-muted-foreground">
                                            Diese Kamera unterstützt keine erweiterten Einstellungen.
                                        </p>
                                    )}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button onClick={capturePhoto} disabled={recognizing || !videoReady} className="flex-1">
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

                        {bulkMode.enabled && (
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
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <Button variant="outline" onClick={startCamera} disabled={!ollamaStatus.available} className="w-full">
                            <Camera className="mr-2 h-4 w-4" />
                            Kamera starten
                        </Button>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Button
                                    variant="outline"
                                    disabled={!ollamaStatus.available}
                                    className="w-full"
                                    onClick={() => document.getElementById('file-single')?.click()}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Bild
                                </Button>
                                <input id="file-single" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            </div>
                            <div className="relative flex-1">
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
                            <div className="relative flex-1">
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
                                    {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
