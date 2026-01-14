import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowRight, Database, ExternalLink, FileJson, Info, Layers } from 'lucide-react';

interface MappingItem {
    source: string;
    target: string;
    description: string;
}

interface GameMapping {
    name: string;
    source: string;
    sourceUrl: string | null;
    cardMappings: MappingItem[];
    printingMappings: MappingItem[];
    setMappings: MappingItem[];
    constants: Record<string, Record<string, string> | string[]>;
    notes: string[];
}

interface Props {
    games: Record<string, GameMapping>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Platform', href: '/dashboard' },
    { title: 'Data Mappings', href: '/data-mappings' },
];

function MappingTable({ mappings, title, icon: Icon }: { mappings: MappingItem[]; title: string; icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Quelle</th>
                                <th className="py-2 px-3 text-center w-12"></th>
                                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Ziel (Unified)</th>
                                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Beschreibung</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mappings.map((mapping, index) => (
                                <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                                    <td className="py-2 px-3">
                                        <code className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-xs">
                                            {mapping.source}
                                        </code>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                                    </td>
                                    <td className="py-2 px-3">
                                        <code className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded text-xs">
                                            {mapping.target}
                                        </code>
                                    </td>
                                    <td className="py-2 px-3 text-muted-foreground">{mapping.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

function ConstantsCard({ constants }: { constants: Record<string, Record<string, string> | string[]> }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <FileJson className="h-5 w-5" />
                    Konstanten & Werte
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(constants).map(([key, values]) => (
                    <div key={key}>
                        <h4 className="font-medium mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {Array.isArray(values)
                                ? values.map((value) => (
                                      <Badge key={value} variant="outline" className="text-xs">
                                          {value}
                                      </Badge>
                                  ))
                                : Object.entries(values).map(([code, label]) => (
                                      <Badge key={code} variant="secondary" className="text-xs">
                                          <span className="font-mono mr-1">{code}</span>
                                          <span className="text-muted-foreground">= {label}</span>
                                      </Badge>
                                  ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function NotesCard({ notes }: { notes: string[] }) {
    if (notes.length === 0) return null;

    return (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-amber-700 dark:text-amber-400">
                    <Info className="h-5 w-5" />
                    Wichtige Hinweise
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {notes.map((note, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-amber-600 dark:text-amber-500 mt-1">•</span>
                            <span>{note}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

function GameMappingContent({ game }: { game: GameMapping }) {
    return (
        <div className="space-y-6">
            {/* Header with source info */}
            <Card>
                <CardHeader>
                    <CardTitle>{game.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                        Datenquelle: <span className="font-medium">{game.source}</span>
                        {game.sourceUrl && (
                            <a
                                href={game.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        )}
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Notes */}
            <NotesCard notes={game.notes} />

            {/* Card Mappings */}
            <MappingTable mappings={game.cardMappings} title="Karten-Mapping" icon={Database} />

            {/* Printing Mappings */}
            <MappingTable mappings={game.printingMappings} title="Printing-Mapping" icon={Layers} />

            {/* Set Mappings */}
            <MappingTable mappings={game.setMappings} title="Set-Mapping" icon={FileJson} />

            {/* Constants */}
            {Object.keys(game.constants).length > 0 && <ConstantsCard constants={game.constants} />}
        </div>
    );
}

export default function DataMappings({ games }: Props) {
    const gameKeys = Object.keys(games);
    const defaultGame = gameKeys[0];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Data Mappings" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div>
                    <h1 className="text-2xl font-bold">Data Mappings</h1>
                    <p className="text-muted-foreground mt-1">
                        Visualisierung der Feld-Mappings von externen Datenquellen zum Unified Data Model
                    </p>
                </div>

                {/* Unified Data Model Overview */}
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Unified Data Model</CardTitle>
                        <CardDescription>
                            Alle Spiele werden in ein einheitliches Datenmodell überführt
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    <Database className="h-4 w-4 text-purple-600" />
                                    UnifiedCard
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Name, Typ, Text, Kosten, Power, Defense, Health, Colors, Keywords, Legalities
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-blue-600" />
                                    UnifiedPrinting
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Set, Collector Number, Rarity, Finish, Language, Artist, Image URL, Prices
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    <FileJson className="h-4 w-4 text-green-600" />
                                    UnifiedSet
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Code, Name, Set Type, Release Date, Card Count, Icon URL
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Game-specific Mappings */}
                <Tabs defaultValue={defaultGame} className="w-full">
                    <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
                        {gameKeys.map((key) => (
                            <TabsTrigger key={key} value={key} className="data-[state=active]:bg-background">
                                {games[key].name}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {gameKeys.map((key) => (
                        <TabsContent key={key} value={key} className="mt-6">
                            <GameMappingContent game={games[key]} />
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </AppLayout>
    );
}
