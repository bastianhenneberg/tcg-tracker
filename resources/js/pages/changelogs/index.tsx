import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle, FileText, Sparkles } from 'lucide-react';

interface Changelog {
    slug: string;
    version: string | null;
    title: string;
    html_content: string;
    published_at: string | null;
    is_read: boolean;
}

interface Props {
    changelogs: Changelog[];
}

function stripHtml(html: string): string {
    if (typeof window === 'undefined') {
        return html.replace(/<[^>]*>/g, '');
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

function truncateText(text: string, maxLength: number = 200): string {
    const stripped = stripHtml(text);
    if (stripped.length <= maxLength) return stripped;
    return stripped.substring(0, maxLength).trim() + '...';
}

export default function ChangelogIndex({ changelogs }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Changelogs', href: '/changelogs' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Changelogs" />

            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold">Changelogs</h1>
                    <p className="text-muted-foreground">Versionshistorie und Updates</p>
                </div>

                {changelogs.length > 0 ? (
                    <div className="space-y-4">
                        {changelogs.map((changelog) => (
                            <Card
                                key={changelog.slug}
                                className={`cursor-pointer transition-all hover:shadow-md ${
                                    !changelog.is_read ? 'border-primary/50 bg-primary/5' : ''
                                }`}
                                onClick={() => router.visit(`/changelogs/${changelog.slug}`)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                                    !changelog.is_read ? 'bg-primary/10' : 'bg-muted'
                                                }`}
                                            >
                                                {!changelog.is_read ? (
                                                    <Sparkles className="h-5 w-5 text-primary" />
                                                ) : (
                                                    <CheckCircle className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div>
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    {changelog.version && (
                                                        <Badge variant="outline">v{changelog.version}</Badge>
                                                    )}
                                                    {changelog.title}
                                                    {!changelog.is_read && (
                                                        <Badge variant="default" className="text-xs">
                                                            Neu
                                                        </Badge>
                                                    )}
                                                </CardTitle>
                                                {changelog.published_at && (
                                                    <CardDescription className="mt-1">
                                                        {changelog.published_at}
                                                    </CardDescription>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        {truncateText(changelog.html_content)}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <FileText className="mb-4 h-16 w-16 text-muted-foreground/50" />
                        <h3 className="text-lg font-semibold">Keine Changelogs</h3>
                        <p className="text-sm text-muted-foreground">Es gibt derzeit keine Changelogs.</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
