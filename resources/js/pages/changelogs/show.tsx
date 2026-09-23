import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Calendar, FileText, Tag } from 'lucide-react';

interface Changelog {
    slug: string;
    version: string | null;
    title: string;
    content: string;
    html_content: string;
    is_markdown: boolean;
    published_at: string | null;
}

interface Props {
    changelog: Changelog;
}

export default function ChangelogShow({ changelog }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Changelogs', href: '/changelogs' },
        { title: changelog.title, href: `/changelogs/${changelog.slug}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={changelog.title} />

            <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/changelogs">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            {changelog.version && (
                                <Badge variant="outline" className="text-sm">
                                    v{changelog.version}
                                </Badge>
                            )}
                            <h1 className="text-3xl font-bold">{changelog.title}</h1>
                        </div>
                        <p className="text-muted-foreground">Changelog</p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                        <FileText className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {changelog.version && (
                                                <Badge variant="outline">v{changelog.version}</Badge>
                                            )}
                                            {changelog.title}
                                        </CardTitle>
                                        {changelog.published_at && (
                                            <CardDescription>{changelog.published_at}</CardDescription>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: changelog.html_content }}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {changelog.version && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                            <Tag className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">v{changelog.version}</div>
                                            <div className="text-xs text-muted-foreground">Version</div>
                                        </div>
                                    </div>
                                )}
                                {changelog.published_at && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{changelog.published_at}</div>
                                            <div className="text-xs text-muted-foreground">Veröffentlicht</div>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">
                                            {changelog.is_markdown ? 'Markdown' : 'HTML'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Format</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/changelogs">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Alle Changelogs
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
