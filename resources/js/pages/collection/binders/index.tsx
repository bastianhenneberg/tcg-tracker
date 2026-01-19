import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { BookOpen, Plus } from 'lucide-react';
import { useState } from 'react';

interface Binder {
    id: number;
    name: string;
    description: string | null;
    color: string | null;
    pages_count: number;
    inventory_items_count: number;
}

interface Props {
    binders: Binder[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ordner',
        href: '/binders',
    },
];

export default function BindersIndex({ binders }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);

    const form = useForm({
        name: '',
        description: '',
        color: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/binders', {
            onSuccess: () => {
                setDialogOpen(false);
                form.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ordner" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Ordner</h1>
                        <p className="text-muted-foreground text-sm">
                            Organisiere deine Sammlung wie in echten Sammelkarten-Ordnern
                        </p>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Neuer Ordner
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Neuen Ordner erstellen</DialogTitle>
                                <DialogDescription>
                                    Erstelle einen neuen Ordner mit 3x3 Seiten zur Präsentation deiner Sammlung.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        placeholder="z.B. Meine Favoriten"
                                        autoFocus
                                    />
                                    {form.errors.name && (
                                        <p className="text-destructive text-sm">{form.errors.name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Beschreibung (optional)</Label>
                                    <Input
                                        id="description"
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        placeholder="z.B. Seltene Karten & Full Arts"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                        Abbrechen
                                    </Button>
                                    <Button type="submit" disabled={form.processing}>
                                        Erstellen
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {binders.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
                            <h3 className="text-lg font-medium">Keine Ordner</h3>
                            <p className="text-muted-foreground mb-4 text-center">
                                Erstelle deinen ersten Ordner, um deine Sammlung zu organisieren.
                            </p>
                            <Button onClick={() => setDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Ersten Ordner erstellen
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {binders.map((binder) => (
                            <Link key={binder.id} href={`/binders/${binder.id}`}>
                                <Card className="transition-colors hover:border-primary">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BookOpen className="h-5 w-5" />
                                            {binder.name}
                                        </CardTitle>
                                        {binder.description && (
                                            <CardDescription>{binder.description}</CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-muted-foreground flex gap-4 text-sm">
                                            <span>{binder.pages_count} Seiten</span>
                                            <span>{binder.inventory_items_count} Karten</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
