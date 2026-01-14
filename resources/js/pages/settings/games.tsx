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
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Gamepad2, Plus, Settings2, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface Game {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    is_official: boolean;
    fab_cards_count: number;
    formats_count: number;
    attributes_count: number;
}

interface Props {
    games: Game[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Spiele',
        href: '/settings/games',
    },
];

export default function GamesSettings({ games }: Props) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Spiele verwalten" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Spiele verwalten</h1>
                        <p className="text-muted-foreground">
                            Verwalte offizielle und eigene Kartenspiele
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Neues Spiel
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {games.map((game) => (
                        <GameCard key={game.id} game={game} />
                    ))}
                </div>

                {games.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                        <Gamepad2 className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">Keine Spiele</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Erstelle dein erstes eigenes Kartenspiel oder warte auf offizielle Spiele.
                        </p>
                    </div>
                )}

                <CreateGameDialog
                    isOpen={isCreateDialogOpen}
                    onClose={() => setIsCreateDialogOpen(false)}
                />
            </div>
        </AppLayout>
    );
}

function GameCard({ game }: { game: Game }) {
    return (
        <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium">{game.name}</h3>
                            {game.is_official && (
                                <Badge variant="secondary" className="text-xs">
                                    <Sparkles className="mr-1 h-3 w-3" />
                                    Offiziell
                                </Badge>
                            )}
                        </div>
                        {game.description && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {game.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{game.fab_cards_count} Karten</span>
                    <span>{game.formats_count} Formate</span>
                    <span>{game.attributes_count} Attribute</span>
                </div>
                <Link href={`/settings/games/${game.id}`}>
                    <Button variant="outline" size="sm">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Konfigurieren
                    </Button>
                </Link>
            </div>
        </div>
    );
}

function CreateGameDialog({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/settings/games', {
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
                    <DialogTitle>Neues Spiel erstellen</DialogTitle>
                    <DialogDescription>
                        Erstelle ein eigenes Kartenspiel mit individuellen Attributen und Formaten.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="z.B. Mein Kartenspiel"
                            required
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-destructive">{errors.name}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="description">Beschreibung (optional)</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Beschreibe dein Kartenspiel..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Erstellen
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
