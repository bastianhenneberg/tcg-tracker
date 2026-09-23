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
import { type FormEventHandler, useMemo } from 'react';

export default function AdminChangelogCreate() {
    const { data, setData, post, processing, errors, transform } = useForm({
        slug: '',
        version: '',
        title: '',
        content: '',
        published_at: '',
        show_modal: true,
        is_active: true,
    });

    const generatedSlug = useMemo(() => {
        if (data.slug) return data.slug;
        const source = data.version || data.title;
        return source
            .toLowerCase()
            .replace(/[^a-z0-9.]+/g, '-')
            .replace(/^-|-$/g, '');
    }, [data.slug, data.version, data.title]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        transform((payload) => ({ ...payload, slug: generatedSlug }));
        post('/admin/changelogs');
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/admin' },
        { title: 'Changelogs', href: '/admin/changelogs' },
        { title: 'Erstellen', href: '/admin/changelogs/create' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Changelog erstellen" />

            <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/changelogs">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Neuer Changelog</h1>
                        <p className="text-muted-foreground">Erstellen Sie einen neuen Changelog-Eintrag</p>
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
                                            <Label htmlFor="slug">Slug (Dateiname)</Label>
                                            <Input
                                                id="slug"
                                                value={data.slug}
                                                onChange={(e) => setData('slug', e.target.value)}
                                                placeholder={generatedSlug || 'wird automatisch generiert'}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Wird als Dateiname verwendet: {generatedSlug || '...'}.md
                                            </p>
                                            <InputError message={errors.slug} />
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
                                            placeholder="## Neue Features&#10;&#10;- Feature 1&#10;- Feature 2&#10;&#10;## Fehlerbehebungen&#10;&#10;- Bug 1 behoben"
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
                                    <Link href="/admin/changelogs">Abbrechen</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
