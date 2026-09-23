import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { MarkdownEditor } from '@peppermint-digital/markdown-editor/react';
import { ArrowLeft, Save } from 'lucide-react';
import { type FormEventHandler } from 'react';

interface Changelog {
    slug: string;
    version: string | null;
    title: string;
    content: string;
    published_at: string | null;
    show_modal: boolean;
    is_active: boolean;
}

interface Props {
    changelog: Changelog;
}

export default function AdminChangelogEdit({ changelog }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        version: changelog.version ?? '',
        title: changelog.title,
        content: changelog.content,
        published_at: changelog.published_at ?? '',
        show_modal: changelog.show_modal,
        is_active: changelog.is_active,
    });

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        put(`/admin/changelogs/${changelog.slug}`);
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/admin' },
        { title: 'Changelogs', href: '/admin/changelogs' },
        { title: changelog.title, href: `/admin/changelogs/${changelog.slug}` },
        { title: 'Bearbeiten', href: `/admin/changelogs/${changelog.slug}/edit` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Changelog bearbeiten: ${changelog.title}`} />

            <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/changelogs/${changelog.slug}`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Changelog bearbeiten</h1>
                        <p className="text-muted-foreground">{changelog.slug}.md</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Grunddaten</CardTitle>
                                    <CardDescription>Titel, Version und Inhalt des Changelogs</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="version">Version</Label>
                                            <Input
                                                id="version"
                                                value={data.version}
                                                onChange={(e) => setData('version', e.target.value)}
                                                placeholder="z.B. 1.2.0"
                                            />
                                            <InputError message={errors.version} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Slug (Dateiname)</Label>
                                            <Input value={changelog.slug} disabled className="bg-muted" />
                                            <p className="text-xs text-muted-foreground">
                                                Der Slug kann nicht geändert werden
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="title">Titel *</Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Changelog-Titel"
                                            required
                                        />
                                        <InputError message={errors.title} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="content">Inhalt (Markdown) *</Label>
                                        <MarkdownEditor
                                            value={data.content}
                                            onChange={(value) => setData('content', value)}
                                            placeholder="## Neue Features&#10;&#10;- Feature 1&#10;- Feature 2"
                                            minHeight="400px"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Verwenden Sie Markdown-Formatierung
                                        </p>
                                        <InputError message={errors.content} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Veröffentlichung</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="published_at">Veröffentlichungsdatum</Label>
                                        <Input
                                            id="published_at"
                                            type="datetime-local"
                                            value={data.published_at}
                                            onChange={(e) => setData('published_at', e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Leer lassen für sofortige Veröffentlichung
                                        </p>
                                        <InputError message={errors.published_at} />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => setData('is_active', checked === true)}
                                        />
                                        <Label htmlFor="is_active" className="text-sm font-normal">
                                            Aktiv
                                        </Label>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Anzeige</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="show_modal"
                                            checked={data.show_modal}
                                            onCheckedChange={(checked) => setData('show_modal', checked === true)}
                                        />
                                        <Label htmlFor="show_modal" className="text-sm font-normal">
                                            Als Modal anzeigen
                                        </Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Zeigt diesen Changelog als Modal an, bis der Benutzer ihn schließt
                                    </p>
                                </CardContent>
                            </Card>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing} className="flex-1">
                                    <Save className="mr-2 h-4 w-4" />
                                    Speichern
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={`/admin/changelogs/${changelog.slug}`}>Abbrechen</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
