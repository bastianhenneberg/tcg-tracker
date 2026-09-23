import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, CheckCircle, Edit, Eye, FileText, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Changelog {
    slug: string;
    version: string | null;
    title: string;
    is_markdown: boolean;
    published_at: string | null;
    show_modal: boolean;
    is_active: boolean;
    is_published: boolean;
    reads_count: number;
}

interface Props {
    changelogs: Changelog[];
}

export default function AdminChangelogIndex({ changelogs }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/admin' },
        { title: 'Changelogs', href: '/admin/changelogs' },
    ];

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletingChangelog, setDeletingChangelog] = useState<Changelog | null>(null);

    const openDeleteDialog = (changelog: Changelog) => {
        setDeletingChangelog(changelog);
        setShowDeleteDialog(true);
    };

    const confirmDelete = () => {
        if (!deletingChangelog) return;
        router.delete(`/admin/changelogs/${deletingChangelog.slug}`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowDeleteDialog(false);
                setDeletingChangelog(null);
            },
        });
    };

    const activeCount = changelogs.filter((c) => c.is_active && c.is_published).length;
    const modalCount = changelogs.filter((c) => c.show_modal).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Changelogs verwalten" />

            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Changelogs</h1>
                        <p className="text-muted-foreground">
                            Dateibasierte Changelogs im <code>changelogs/</code> Ordner
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/admin/changelogs/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Neuer Changelog
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{changelogs.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aktiv</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{activeCount}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Mit Modal</CardTitle>
                            <Calendar className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{modalCount}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Alle Changelogs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {changelogs.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Version / Titel</TableHead>
                                        <TableHead>Format</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Veröffentlicht</TableHead>
                                        <TableHead>Gelesen</TableHead>
                                        <TableHead className="w-[100px]">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {changelogs.map((changelog) => (
                                        <TableRow key={changelog.slug}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        {changelog.version && (
                                                            <Badge variant="outline">v{changelog.version}</Badge>
                                                        )}
                                                        <span className="font-medium">{changelog.title}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {changelog.slug}.md
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">Markdown</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {!changelog.is_active ? (
                                                        <Badge variant="secondary">Inaktiv</Badge>
                                                    ) : !changelog.is_published ? (
                                                        <Badge variant="outline">Geplant</Badge>
                                                    ) : (
                                                        <Badge variant="default" className="bg-green-500">
                                                            Aktiv
                                                        </Badge>
                                                    )}
                                                    {changelog.show_modal && (
                                                        <Badge variant="outline" className="text-xs">
                                                            Modal
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {changelog.published_at ? (
                                                    <span>{changelog.published_at}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">Sofort</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{changelog.reads_count}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <span className="sr-only">Menü öffnen</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/changelogs/${changelog.slug}`}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                Anzeigen
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/changelogs/${changelog.slug}/edit`}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Bearbeiten
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => openDeleteDialog(changelog)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Löschen
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="py-12 text-center">
                                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                <h3 className="mt-2 text-sm font-semibold">Keine Changelogs</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Erstellen Sie einen neuen Changelog.
                                </p>
                                <div className="mt-6">
                                    <Button asChild>
                                        <Link href="/admin/changelogs/create">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Ersten Changelog erstellen
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Changelog löschen?</DialogTitle>
                        <DialogDescription>
                            Möchten Sie den Changelog "{deletingChangelog?.title}" wirklich löschen?
                            Die Datei {deletingChangelog?.slug}.md wird unwiderruflich gelöscht.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Abbrechen
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete}>
                            Löschen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
