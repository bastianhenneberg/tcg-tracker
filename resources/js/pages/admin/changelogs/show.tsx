import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Calendar, Edit, Eye, FileText, MessageSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Reader {
    id: number;
    name: string;
    read_at: string;
    modal_dismissed: boolean;
}

interface Changelog {
    slug: string;
    version: string | null;
    title: string;
    content: string;
    html_content: string;
    is_markdown: boolean;
    published_at: string | null;
    show_modal: boolean;
    is_active: boolean;
    is_published: boolean;
    reads_count: number;
    readers: Reader[];
}

interface Props {
    changelog: Changelog;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
}

export default function AdminChangelogShow({ changelog }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/admin' },
        { title: 'Changelogs', href: '/admin/changelogs' },
        { title: changelog.title, href: `/admin/changelogs/${changelog.slug}` },
    ];

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const confirmDelete = () => {
        router.delete(`/admin/changelogs/${changelog.slug}`, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={changelog.title} />

            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/admin/changelogs">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                {changelog.version && (
                                    <Badge variant="outline">v{changelog.version}</Badge>
                                )}
                                <h1 className="text-3xl font-bold">{changelog.title}</h1>
                            </div>
                            <p className="text-muted-foreground">{changelog.slug}.md</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={`/admin/changelogs/${changelog.slug}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Bearbeiten
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Inhalt
                                </CardTitle>
                                <CardDescription>Markdown-Formatierung</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: changelog.html_content }}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Quelltext (Markdown)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 font-mono text-sm">
                                    {changelog.content}
                                </pre>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    {!changelog.is_active ? (
                                        <Badge variant="secondary">Inaktiv</Badge>
                                    ) : !changelog.is_published ? (
                                        <Badge variant="outline">Geplant</Badge>
                                    ) : (
                                        <Badge variant="default" className="bg-green-500">
                                            Aktiv
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Format</span>
                                    <Badge variant="secondary">Markdown</Badge>
                                </div>
                                <Collapsible>
                                    <CollapsibleTrigger className="flex w-full items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Gelesen von</span>
                                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                            <Eye className="mr-1 h-3 w-3" />
                                            {changelog.reads_count} Benutzer
                                        </Badge>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        {changelog.readers.length === 0 ? (
                                            <div className="mt-3 text-sm text-muted-foreground">
                                                Noch niemand hat diesen Changelog gelesen.
                                            </div>
                                        ) : (
                                            <ScrollArea className="mt-3 max-h-48">
                                                <div className="space-y-2">
                                                    {changelog.readers.map((reader) => (
                                                        <div
                                                            key={reader.id}
                                                            className="flex items-center gap-3 rounded-md border p-2"
                                                        >
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback className="text-xs">
                                                                    {getInitials(reader.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="truncate text-sm font-medium">
                                                                    {reader.name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {reader.read_at}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        )}
                                    </CollapsibleContent>
                                </Collapsible>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Anzeigeoptionen</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                            changelog.show_modal
                                                ? 'bg-green-100 dark:bg-green-900'
                                                : 'bg-gray-100 dark:bg-gray-800'
                                        }`}
                                    >
                                        <MessageSquare
                                            className={`h-4 w-4 ${
                                                changelog.show_modal
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-gray-400'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">Modal anzeigen</div>
                                        <div className="text-xs text-muted-foreground">
                                            {changelog.show_modal ? 'Aktiviert' : 'Deaktiviert'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Zeitplanung</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                                        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">Veröffentlichung</div>
                                        <div className="text-xs text-muted-foreground">
                                            {changelog.published_at || 'Sofort'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Informationen</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {changelog.version && (
                                    <div>
                                        <div className="text-muted-foreground">Version</div>
                                        <div className="font-medium">v{changelog.version}</div>
                                    </div>
                                )}
                                <div>
                                    <div className="text-muted-foreground">Datei</div>
                                    <div className="font-mono text-xs font-medium">
                                        changelogs/{changelog.slug}.md
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Changelog löschen?</DialogTitle>
                        <DialogDescription>
                            Möchten Sie den Changelog "{changelog.title}" wirklich löschen?
                            Die Datei {changelog.slug}.md wird unwiderruflich gelöscht.
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
