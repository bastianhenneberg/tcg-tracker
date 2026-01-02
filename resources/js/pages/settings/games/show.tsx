import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface GameAttribute {
    id: number;
    type: string;
    key: string;
    label: string;
    sort_order: number;
}

interface GameFormat {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    is_active: boolean;
}

interface Game {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    is_official: boolean;
    attributes: GameAttribute[];
    formats: GameFormat[];
}

interface Props {
    game: Game;
    attributeTypes: Record<string, string>;
}

export default function GameShow({ game, attributeTypes }: Props) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isAddAttributeDialogOpen, setIsAddAttributeDialogOpen] = useState(false);
    const [isAddFormatDialogOpen, setIsAddFormatDialogOpen] = useState(false);
    const [selectedAttributeType, setSelectedAttributeType] = useState<string>('rarity');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Spiele', href: '/settings/games' },
        { title: game.name, href: `/settings/games/${game.id}` },
    ];

    const canEdit = !game.is_official;

    const groupedAttributes = Object.entries(attributeTypes).map(([type, label]) => ({
        type,
        label,
        attributes: game.attributes.filter((a) => a.type === type),
    }));

    const handleDeleteGame = () => {
        if (!confirm(`"${game.name}" wirklich löschen? Alle zugehörigen Daten werden gelöscht.`)) return;
        router.delete(`/settings/games/${game.id}`, {
            onSuccess: () => router.visit('/settings/games'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${game.name} - Einstellungen`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.visit('/settings/games')}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h1 className="text-2xl font-bold">{game.name}</h1>
                            {game.is_official && (
                                <Badge variant="secondary">
                                    <Sparkles className="mr-1 h-3 w-3" />
                                    Offiziell
                                </Badge>
                            )}
                        </div>
                        {game.description && (
                            <p className="mt-2 text-muted-foreground">{game.description}</p>
                        )}
                    </div>
                    {canEdit && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Bearbeiten
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteGame}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Löschen
                            </Button>
                        </div>
                    )}
                </div>

                {/* Formats */}
                <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Formate</h2>
                            <p className="text-sm text-muted-foreground">Spielformate mit unterschiedlichen Regeln</p>
                        </div>
                        {canEdit && (
                            <Button size="sm" onClick={() => setIsAddFormatDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Format hinzufügen
                            </Button>
                        )}
                    </div>

                    {game.formats.length > 0 ? (
                        <div className="grid gap-2">
                            {game.formats.map((format) => (
                                <div
                                    key={format.id}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{format.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {format.slug}
                                            </Badge>
                                        </div>
                                        {format.description && (
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {format.description}
                                            </p>
                                        )}
                                    </div>
                                    {canEdit && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                if (confirm('Format löschen?')) {
                                                    router.delete(
                                                        `/settings/games/${game.id}/formats/${format.id}`
                                                    );
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Keine Formate definiert.</p>
                    )}
                </div>

                {/* Attributes */}
                <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Attribute</h2>
                            <p className="text-sm text-muted-foreground">Seltenheiten, Foilings, Sprachen und mehr</p>
                        </div>
                        {canEdit && (
                            <Button size="sm" onClick={() => setIsAddAttributeDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Attribut hinzufügen
                            </Button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {groupedAttributes.map(({ type, label, attributes }) => (
                            <div key={type} className="space-y-2">
                                <h4 className="text-sm font-medium">{label}</h4>
                                {attributes.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {attributes.map((attr) => (
                                            <Badge
                                                key={attr.id}
                                                variant="secondary"
                                                className="gap-1"
                                            >
                                                {attr.label}
                                                <span className="text-muted-foreground">
                                                    ({attr.key})
                                                </span>
                                                {canEdit && (
                                                    <button
                                                        className="ml-1 hover:text-destructive"
                                                        onClick={() => {
                                                            if (confirm('Attribut löschen?')) {
                                                                router.delete(
                                                                    `/settings/games/${game.id}/attributes/${attr.id}`
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Keine {label.toLowerCase()} definiert.
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Edit Game Dialog */}
                <EditGameDialog
                    isOpen={isEditDialogOpen}
                    onClose={() => setIsEditDialogOpen(false)}
                    game={game}
                />

                {/* Add Attribute Dialog */}
                <AddAttributeDialog
                    isOpen={isAddAttributeDialogOpen}
                    onClose={() => setIsAddAttributeDialogOpen(false)}
                    gameId={game.id}
                    attributeTypes={attributeTypes}
                    selectedType={selectedAttributeType}
                    onTypeChange={setSelectedAttributeType}
                />

                {/* Add Format Dialog */}
                <AddFormatDialog
                    isOpen={isAddFormatDialogOpen}
                    onClose={() => setIsAddFormatDialogOpen(false)}
                    gameId={game.id}
                />
            </div>
        </AppLayout>
    );
}

function EditGameDialog({
    isOpen,
    onClose,
    game,
}: {
    isOpen: boolean;
    onClose: () => void;
    game: Game;
}) {
    const { data, setData, patch, processing } = useForm({
        name: game.name,
        description: game.description ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(`/settings/games/${game.id}`, {
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Spiel bearbeiten</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="edit-name">Name</Label>
                        <Input
                            id="edit-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="edit-description">Beschreibung</Label>
                        <Textarea
                            id="edit-description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Speichern
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AddAttributeDialog({
    isOpen,
    onClose,
    gameId,
    attributeTypes,
    selectedType,
    onTypeChange,
}: {
    isOpen: boolean;
    onClose: () => void;
    gameId: number;
    attributeTypes: Record<string, string>;
    selectedType: string;
    onTypeChange: (type: string) => void;
}) {
    const { data, setData, post, processing, reset } = useForm({
        type: selectedType,
        key: '',
        label: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/settings/games/${gameId}/attributes`, {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Attribut hinzufügen</DialogTitle>
                    <DialogDescription>
                        Füge eine neue Seltenheit, Foiling, Sprache oder ähnliches hinzu.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Typ</Label>
                        <Select
                            value={data.type}
                            onValueChange={(v) => {
                                setData('type', v);
                                onTypeChange(v);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(attributeTypes).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="attr-key">Schlüssel</Label>
                            <Input
                                id="attr-key"
                                value={data.key}
                                onChange={(e) => setData('key', e.target.value.toUpperCase())}
                                placeholder="z.B. R, RF, EN"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="attr-label">Bezeichnung</Label>
                            <Input
                                id="attr-label"
                                value={data.label}
                                onChange={(e) => setData('label', e.target.value)}
                                placeholder="z.B. Rare, Rainbow Foil"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Hinzufügen
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AddFormatDialog({
    isOpen,
    onClose,
    gameId,
}: {
    isOpen: boolean;
    onClose: () => void;
    gameId: number;
}) {
    const { data, setData, post, processing, reset } = useForm({
        name: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/settings/games/${gameId}/formats`, {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Format hinzufügen</DialogTitle>
                    <DialogDescription>
                        Erstelle ein neues Spielformat mit eigenen Regeln.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="format-name">Name</Label>
                        <Input
                            id="format-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="z.B. Standard, Modern, Draft"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="format-description">Beschreibung (optional)</Label>
                        <Textarea
                            id="format-description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Beschreibe die Regeln dieses Formats..."
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Hinzufügen
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
