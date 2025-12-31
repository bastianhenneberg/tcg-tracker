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
import { index as boxesIndex, show as boxShow, store as boxStore } from '@/routes/boxes';
import { type BreadcrumbItem } from '@/types';
import { type Box } from '@/types/inventory';
import { Head, Link, useForm } from '@inertiajs/react';
import { Package, Plus } from 'lucide-react';
import { useState } from 'react';

interface Props {
    boxes: Box[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Kartons',
        href: boxesIndex().url,
    },
];

export default function BoxesIndex({ boxes }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);

    const form = useForm({
        name: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(boxStore().url, {
            onSuccess: () => {
                setDialogOpen(false);
                form.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Kartons" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Kartons</h1>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Neuer Karton
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Neuen Karton erstellen</DialogTitle>
                                <DialogDescription>
                                    Erstelle einen neuen Karton zur physischen Aufbewahrung deiner Karten.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        placeholder="z.B. FaB Box 1"
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
                                        placeholder="z.B. Regal oben links"
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

                {boxes.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Package className="text-muted-foreground mb-4 h-12 w-12" />
                            <h3 className="text-lg font-medium">Keine Kartons</h3>
                            <p className="text-muted-foreground mb-4 text-center">
                                Erstelle deinen ersten Karton, um mit dem Scannen zu beginnen.
                            </p>
                            <Button onClick={() => setDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Ersten Karton erstellen
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {boxes.map((box) => (
                            <Link key={box.id} href={boxShow(box).url}>
                                <Card className="transition-colors hover:border-primary">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Package className="h-5 w-5" />
                                            {box.name}
                                        </CardTitle>
                                        {box.description && (
                                            <CardDescription>{box.description}</CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground text-sm">
                                            {box.lots_count ?? 0} Lots
                                        </p>
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
