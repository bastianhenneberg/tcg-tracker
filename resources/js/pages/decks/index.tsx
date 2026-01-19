import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Deck, GameFormat } from '@/types/deck';
import { Game } from '@/types/unified';
import { Head, Link, router } from '@inertiajs/react';
import { Edit, Layers, Plus, Trash2 } from 'lucide-react';

interface Props {
    game: Game;
    decks: (Deck & { game_format: GameFormat; cards_count: number })[];
}

export default function DecksIndex({ game, decks }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: game.name, href: `/g/${game.slug}/inventory` },
        { title: 'Decks', href: `/g/${game.slug}/decks` },
    ];

    const handleDelete = (deck: Deck) => {
        if (confirm(`Deck "${deck.name}" wirklich löschen?`)) {
            router.delete(`/g/${game.slug}/decks/${deck.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Decks - ${game.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Decks</h1>
                        <p className="text-muted-foreground text-sm">
                            Erstelle und verwalte deine {game.name} Decks
                        </p>
                    </div>

                    <Link href={`/g/${game.slug}/decks/create`}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Neues Deck
                        </Button>
                    </Link>
                </div>

                {decks.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Layers className="text-muted-foreground mb-4 h-12 w-12" />
                            <h3 className="text-lg font-medium">Keine Decks</h3>
                            <p className="text-muted-foreground mb-4 text-center">
                                Erstelle dein erstes {game.name} Deck.
                            </p>
                            <Link href={`/g/${game.slug}/decks/create`}>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Erstes Deck erstellen
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {decks.map((deck) => (
                            <Card key={deck.id} className="group relative">
                                <Link href={`/g/${game.slug}/decks/${deck.id}`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Layers className="h-5 w-5" />
                                            {deck.name}
                                        </CardTitle>
                                        <CardDescription>
                                            {deck.game_format?.name}
                                            {deck.description && ` - ${deck.description}`}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-muted-foreground flex gap-4 text-sm">
                                            <span>{deck.cards_count} Karten</span>
                                            {deck.is_public && (
                                                <span className="text-green-600">Öffentlich</span>
                                            )}
                                            {deck.use_collection_only && (
                                                <span className="text-blue-600">Nur Sammlung</span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Link>
                                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Link href={`/g/${game.slug}/decks/${deck.id}/builder`}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleDelete(deck);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
