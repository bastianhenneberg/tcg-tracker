import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { GameFormat } from '@/types/deck';
import { Game } from '@/types/unified';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Layers } from 'lucide-react';

interface Props {
    game: Game;
    formats: GameFormat[];
}

export default function DecksCreate({ game, formats }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/g/${game.slug}/inventory` },
        { title: 'Decks', href: `/g/${game.slug}/decks` },
        { title: 'Neu', href: `/g/${game.slug}/decks/create` },
    ];

    const form = useForm({
        name: '',
        game_format_id: formats[0]?.id?.toString() || '',
        description: '',
        is_public: false,
        use_collection_only: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/g/${game.slug}/decks`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Neues Deck - ${game.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center gap-4">
                    <Link href={`/g/${game.slug}/decks`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Neues Deck</h1>
                        <p className="text-muted-foreground text-sm">
                            Erstelle ein neues {game.name} Deck
                        </p>
                    </div>
                </div>

                <Card className="mx-auto w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            Deck erstellen
                        </CardTitle>
                        <CardDescription>
                            Wähle ein Format und gib deinem Deck einen Namen
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
                                    placeholder="z.B. Aggro Ninja"
                                    autoFocus
                                />
                                {form.errors.name && (
                                    <p className="text-destructive text-sm">{form.errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="format">Format *</Label>
                                <Select
                                    value={form.data.game_format_id}
                                    onValueChange={(value) => form.setData('game_format_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Format wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {formats.map((format) => (
                                            <SelectItem key={format.id} value={format.id.toString()}>
                                                {format.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.game_format_id && (
                                    <p className="text-destructive text-sm">{form.errors.game_format_id}</p>
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
                                <Link href={`/g/${game.slug}/decks`}>
                                    <Button type="button" variant="outline">
                                        Abbrechen
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={form.processing}>
                                    Deck erstellen
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
