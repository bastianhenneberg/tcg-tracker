import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Deck, GameFormat } from '@/types/deck';
import { Game } from '@/types/unified';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Layers } from 'lucide-react';

interface Props {
    game: Game;
    deck: Deck;
    formats: GameFormat[];
}

export default function DecksEdit({ game, deck, formats }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/g/${game.slug}/inventory` },
        { title: 'Decks', href: `/g/${game.slug}/decks` },
        { title: deck.name, href: `/g/${game.slug}/decks/${deck.id}` },
        { title: 'Bearbeiten', href: `/g/${game.slug}/decks/${deck.id}/edit` },
    ];

    const form = useForm({
        name: deck.name,
        description: deck.description || '',
        is_public: deck.is_public,
        use_collection_only: deck.use_collection_only,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch(`/g/${game.slug}/decks/${deck.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${deck.name} bearbeiten - ${game.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center gap-4">
                    <Link href={`/g/${game.slug}/decks/${deck.id}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Deck bearbeiten</h1>
                        <p className="text-muted-foreground text-sm">
                            Bearbeite die Einstellungen für {deck.name}
                        </p>
                    </div>
                </div>

                <Card className="mx-auto w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            Deck-Einstellungen
                        </CardTitle>
                        <CardDescription>
                            Format: {formats.find((f) => f.id === deck.game_format_id)?.name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    autoFocus
                                />
                                {form.errors.name && (
                                    <p className="text-destructive text-sm">{form.errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Beschreibung</Label>
                                <Textarea
                                    id="description"
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    placeholder="Optionale Beschreibung deines Decks..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-4 rounded-lg border p-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="use_collection_only">Nur eigene Sammlung</Label>
                                        <p className="text-muted-foreground text-sm">
                                            Nur Karten aus deiner Sammlung verwenden
                                        </p>
                                    </div>
                                    <Switch
                                        id="use_collection_only"
                                        checked={form.data.use_collection_only}
                                        onCheckedChange={(checked) =>
                                            form.setData('use_collection_only', checked)
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="is_public">Öffentlich</Label>
                                        <p className="text-muted-foreground text-sm">
                                            Andere können das Deck sehen
                                        </p>
                                    </div>
                                    <Switch
                                        id="is_public"
                                        checked={form.data.is_public}
                                        onCheckedChange={(checked) => form.setData('is_public', checked)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Link href={`/g/${game.slug}/decks/${deck.id}`}>
                                    <Button type="button" variant="outline">
                                        Abbrechen
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={form.processing}>
                                    Speichern
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
