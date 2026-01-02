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
import AppLayout from '@/layouts/app-layout';
import { index as playsetRulesIndex } from '@/routes/playset-rules';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface Game {
    id: number;
    slug: string;
    name: string;
    formats: GameFormat[];
}

interface GameFormat {
    id: number;
    slug: string;
    name: string;
}

interface RuleCondition {
    field: string;
    operator: string;
    value: string;
}

interface PlaysetRule {
    id: number;
    name: string;
    max_copies: number;
    priority: number;
    conditions: {
        match_all?: boolean;
        rules?: RuleCondition[];
    };
}

interface Props {
    games: Game[];
    selectedGameId: number | null;
    selectedFormatId: number | null;
    rules: PlaysetRule[];
    conditionFields: Record<string, string>;
    operators: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Playset-Regeln',
        href: playsetRulesIndex().url,
    },
];

export default function PlaysetRulesSettings({
    games,
    selectedGameId,
    selectedFormatId,
    rules,
    conditionFields,
    operators,
}: Props) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PlaysetRule | null>(null);

    const selectedGame = games.find((g) => g.id === selectedGameId);

    const handleGameChange = (gameId: string) => {
        const game = games.find((g) => g.id === Number(gameId));
        router.get(playsetRulesIndex().url, {
            game: gameId,
            format: game?.formats[0]?.id?.toString(),
        }, { preserveState: true });
    };

    const handleFormatChange = (formatId: string) => {
        router.get(playsetRulesIndex().url, {
            game: selectedGameId?.toString(),
            format: formatId,
        }, { preserveState: true });
    };

    const handleResetDefaults = () => {
        if (!selectedFormatId) return;
        if (!confirm('Alle Regeln für dieses Format auf Standard zurücksetzen?')) return;

        router.post('/settings/playset-rules/reset', {
            game_format_id: selectedFormatId,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Playset-Regeln" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Playset-Regeln</h1>
                        <p className="text-muted-foreground">
                            Definiere wie viele Kopien einer Karte ein vollständiges Playset bilden
                        </p>
                    </div>
                </div>

                {/* Game & Format Selection */}
                <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <Label className="mb-2 block text-sm">Spiel</Label>
                        <Select
                            value={selectedGameId?.toString() ?? ''}
                            onValueChange={handleGameChange}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Spiel wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {games.map((game) => (
                                    <SelectItem key={game.id} value={game.id.toString()}>
                                        {game.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1">
                        <Label className="mb-2 block text-sm">Format</Label>
                        <Select
                            value={selectedFormatId?.toString() ?? ''}
                            onValueChange={handleFormatChange}
                            disabled={!selectedGame}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Format wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {selectedGame?.formats.map((format) => (
                                    <SelectItem key={format.id} value={format.id.toString()}>
                                        {format.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {selectedFormatId && (
                    <>
                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResetDefaults}
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Auf Standard zurücksetzen
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setIsCreateDialogOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Neue Regel
                            </Button>
                        </div>

                        {/* Rules List */}
                        <div className="space-y-3">
                            {rules.length === 0 ? (
                                <p className="py-8 text-center text-muted-foreground">
                                    Keine Regeln definiert. Die Standard-Regel gilt.
                                </p>
                            ) : (
                                rules.map((rule) => (
                                    <RuleCard
                                        key={rule.id}
                                        rule={rule}
                                        conditionFields={conditionFields}
                                        operators={operators}
                                        onEdit={() => setEditingRule(rule)}
                                        onDelete={() => {
                                            if (confirm('Regel wirklich löschen?')) {
                                                router.delete(`/settings/playset-rules/${rule.id}`);
                                            }
                                        }}
                                    />
                                ))
                            )}
                        </div>

                        <div className="rounded-lg border border-dashed p-4">
                            <p className="text-sm text-muted-foreground">
                                <strong>Wie funktionieren Playset-Regeln?</strong>
                                <br />
                                Regeln werden nach Priorität (höchste zuerst) ausgewertet.
                                Die erste passende Regel bestimmt die maximale Anzahl Kopien.
                                <br />
                                Beispiel: Eine Regel mit Priorität 10 für &quot;Legendary&quot; Karten (max 1)
                                wird vor der Default-Regel (Priorität 0, max 3) geprüft.
                            </p>
                        </div>
                    </>
                )}

                {/* Create/Edit Dialog */}
                <RuleDialog
                    isOpen={isCreateDialogOpen || editingRule !== null}
                    onClose={() => {
                        setIsCreateDialogOpen(false);
                        setEditingRule(null);
                    }}
                    rule={editingRule}
                    formatId={selectedFormatId}
                    conditionFields={conditionFields}
                    operators={operators}
                />
            </div>
        </AppLayout>
    );
}

function RuleCard({
    rule,
    conditionFields,
    operators,
    onEdit,
    onDelete,
}: {
    rule: PlaysetRule;
    conditionFields: Record<string, string>;
    operators: Record<string, string>;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const conditions = rule.conditions?.rules ?? [];

    return (
        <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    <Badge variant="secondary">Max {rule.max_copies}</Badge>
                    <Badge variant="outline">Priorität {rule.priority}</Badge>
                </div>
                {conditions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {conditions.map((cond, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                                {conditionFields[cond.field] ?? cond.field}{' '}
                                {operators[cond.operator] ?? cond.operator}{' '}
                                &quot;{cond.value}&quot;
                            </Badge>
                        ))}
                        {rule.conditions?.match_all === false && (
                            <Badge variant="secondary" className="text-xs">
                                (ODER-Verknüpfung)
                            </Badge>
                        )}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onEdit}>
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function RuleDialog({
    isOpen,
    onClose,
    rule,
    formatId,
    conditionFields,
    operators,
}: {
    isOpen: boolean;
    onClose: () => void;
    rule: PlaysetRule | null;
    formatId: number | null;
    conditionFields: Record<string, string>;
    operators: Record<string, string>;
}) {
    const isEditing = rule !== null;

    const { data, setData, post, patch, processing, reset } = useForm({
        game_format_id: formatId ?? 0,
        name: rule?.name ?? '',
        max_copies: rule?.max_copies ?? 3,
        priority: rule?.priority ?? 0,
        conditions: rule?.conditions ?? { match_all: true, rules: [] },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && rule) {
            patch(`/settings/playset-rules/${rule.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/settings/playset-rules', {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    const addCondition = () => {
        const newRules = [...(data.conditions.rules ?? []), { field: 'rarity', operator: 'equals', value: '' }];
        setData('conditions', { ...data.conditions, rules: newRules });
    };

    const updateCondition = (index: number, field: keyof RuleCondition, value: string) => {
        const newRules = [...(data.conditions.rules ?? [])];
        newRules[index] = { ...newRules[index], [field]: value };
        setData('conditions', { ...data.conditions, rules: newRules });
    };

    const removeCondition = (index: number) => {
        const newRules = (data.conditions.rules ?? []).filter((_, i) => i !== index);
        setData('conditions', { ...data.conditions, rules: newRules });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Regel bearbeiten' : 'Neue Regel erstellen'}</DialogTitle>
                    <DialogDescription>
                        Definiere wann diese Regel angewendet wird und wie viele Kopien erlaubt sind.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="z.B. Legendary Equipment"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="max_copies">Max Kopien</Label>
                            <Input
                                id="max_copies"
                                type="number"
                                min={0}
                                max={99}
                                value={data.max_copies}
                                onChange={(e) => setData('max_copies', Number(e.target.value))}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="priority">Priorität (höher = wird zuerst geprüft)</Label>
                        <Input
                            id="priority"
                            type="number"
                            min={0}
                            max={100}
                            value={data.priority}
                            onChange={(e) => setData('priority', Number(e.target.value))}
                        />
                    </div>

                    {/* Conditions */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Bedingungen</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                                <Plus className="mr-1 h-3 w-3" />
                                Bedingung
                            </Button>
                        </div>

                        {(data.conditions.rules ?? []).length > 0 && (
                            <div className="space-y-2">
                                {(data.conditions.rules ?? []).map((cond, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Select
                                            value={cond.field}
                                            onValueChange={(v) => updateCondition(index, 'field', v)}
                                        >
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(conditionFields).map(([key, label]) => (
                                                    <SelectItem key={key} value={key}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={cond.operator}
                                            onValueChange={(v) => updateCondition(index, 'operator', v)}
                                        >
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(operators).map(([key, label]) => (
                                                    <SelectItem key={key} value={key}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            value={cond.value}
                                            onChange={(e) => updateCondition(index, 'value', e.target.value)}
                                            placeholder="Wert"
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeCondition(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}

                                {(data.conditions.rules ?? []).length > 1 && (
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm">Verknüpfung:</Label>
                                        <Select
                                            value={data.conditions.match_all === false ? 'or' : 'and'}
                                            onValueChange={(v) =>
                                                setData('conditions', { ...data.conditions, match_all: v === 'and' })
                                            }
                                        >
                                            <SelectTrigger className="w-[100px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="and">UND</SelectItem>
                                                <SelectItem value="or">ODER</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}

                        {(data.conditions.rules ?? []).length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Ohne Bedingungen gilt diese Regel für alle Karten.
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {isEditing ? 'Speichern' : 'Erstellen'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
