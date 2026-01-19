import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { type UnifiedInventory } from '@/types/unified';
import { Head, Link, router } from '@inertiajs/react';
import { BookOpen, ChevronLeft, ChevronRight, Edit, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface BinderPage {
    id: number;
    page_number: number;
    notes: string | null;
    inventory_items_count: number;
}

interface Binder {
    id: number;
    name: string;
    description: string | null;
    color: string | null;
    pages: BinderPage[];
}

interface Props {
    binder: Binder;
    currentPage: BinderPage | null;
    currentPageNumber: number;
    slots: Record<number, UnifiedInventory | null>;
    totalPages: number;
}

export default function BinderShow({
    binder,
    currentPage,
    currentPageNumber,
    slots,
    totalPages,
}: Props) {
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editForm, setEditForm] = useState({
        name: binder.name,
        description: binder.description ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [addingPage, setAddingPage] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Ordner', href: '/binders' },
        { title: binder.name, href: `/binders/${binder.id}` },
    ];

    const handleSave = () => {
        setSaving(true);
        router.patch(`/binders/${binder.id}`, editForm, {
            onSuccess: () => {
                setShowEditDialog(false);
                setSaving(false);
            },
            onError: () => setSaving(false),
        });
    };

    const handleDelete = () => {
        setDeleting(true);
        router.delete(`/binders/${binder.id}`, {
            onError: () => setDeleting(false),
        });
    };

    const handleAddPage = () => {
        setAddingPage(true);
        router.post(`/binders/${binder.id}/pages`, {}, {
            onSuccess: () => setAddingPage(false),
            onError: () => setAddingPage(false),
        });
    };

    const goToPage = (pageNum: number) => {
        router.get(`/binders/${binder.id}`, { page: pageNum }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Generate 3x3 grid slots (1-9)
    const gridSlots = Array.from({ length: 9 }, (_, i) => i + 1);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={binder.name} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <BookOpen className="h-6 w-6" />
                            {binder.name}
                        </h1>
                        {binder.description && (
                            <p className="text-muted-foreground">{binder.description}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Bearbeiten
                        </Button>
                        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                        </Button>
                    </div>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                    <Button
                        variant="outline"
                        onClick={() => goToPage(currentPageNumber - 1)}
                        disabled={currentPageNumber <= 1}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Vorherige
                    </Button>

                    <div className="flex items-center gap-4">
                        <span className="text-lg font-medium">
                            Seite {currentPageNumber} von {totalPages || 0}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddPage}
                            disabled={addingPage}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Neue Seite
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => goToPage(currentPageNumber + 1)}
                        disabled={currentPageNumber >= totalPages}
                    >
                        Nächste
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>

                {/* 3x3 Binder Grid */}
                {currentPage ? (
                    <Card className="border-2">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-3 gap-4">
                                {gridSlots.map((slot) => {
                                    const item = slots[slot];
                                    return (
                                        <div
                                            key={slot}
                                            className="relative aspect-[2.5/3.5] rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 transition-colors hover:border-primary/50"
                                        >
                                            {item ? (
                                                <Link
                                                    href={`/binder-pages/${currentPage.id}`}
                                                    className="block h-full w-full"
                                                >
                                                    <div className="flex h-full flex-col items-center justify-center p-2">
                                                        {item.printing?.image_url ? (
                                                            <img
                                                                src={item.printing.image_url}
                                                                alt={item.printing.card?.name ?? ''}
                                                                className="h-full w-full rounded object-contain"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                <span className="text-muted-foreground text-center text-xs">
                                                                    {item.printing?.card?.name}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={`/binder-pages/${currentPage.id}`}
                                                    className="flex h-full w-full items-center justify-center"
                                                >
                                                    <div className="text-muted-foreground/50 flex flex-col items-center gap-2">
                                                        <Plus className="h-8 w-8" />
                                                        <span className="text-xs">Slot {slot}</span>
                                                    </div>
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Page Notes */}
                            {currentPage.notes && (
                                <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                                    <p className="text-muted-foreground text-sm">{currentPage.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
                            <h3 className="text-lg font-medium">Keine Seiten</h3>
                            <p className="text-muted-foreground mb-4 text-center">
                                Erstelle deine erste Seite, um Karten hinzuzufügen.
                            </p>
                            <Button onClick={handleAddPage} disabled={addingPage}>
                                <Plus className="mr-2 h-4 w-4" />
                                Erste Seite erstellen
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Quick Page Navigation */}
                {totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {binder.pages.map((page) => (
                            <Button
                                key={page.id}
                                variant={page.page_number === currentPageNumber ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => goToPage(page.page_number)}
                            >
                                {page.page_number}
                            </Button>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ordner bearbeiten</DialogTitle>
                        <DialogDescription>Ändere den Namen oder die Beschreibung des Ordners.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Beschreibung</Label>
                            <Textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="Optionale Beschreibung..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Speichern...' : 'Speichern'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ordner löschen?</DialogTitle>
                        <DialogDescription>
                            Möchtest du den Ordner "{binder.name}" wirklich löschen?
                            Die Karten bleiben in deiner Sammlung, werden aber aus dem Ordner entfernt.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Löschen...' : 'Löschen'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
