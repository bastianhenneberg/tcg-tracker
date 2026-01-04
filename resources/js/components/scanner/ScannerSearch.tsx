import { CardImage } from '@/components/card-image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import type { CardMatch } from './types';

interface ScannerSearchProps {
    searchQuery: string;
    searchResults: CardMatch[];
    searching: boolean;
    onSearchChange: (query: string) => void;
    onSelectCard: (card: CardMatch) => void;
    getRarityLabel?: (rarity: string) => string;
}

export function ScannerSearch({
    searchQuery,
    searchResults,
    searching,
    onSearchChange,
    onSelectCard,
    getRarityLabel = (r) => r,
}: ScannerSearchProps) {
    const [selectedResultIndex, setSelectedResultIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedResultIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedResultIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && searchResults[selectedResultIndex]) {
            e.preventDefault();
            onSelectCard(searchResults[selectedResultIndex]);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Search className="h-5 w-5" />
                    Manuelle Suche
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="relative">
                    <Input
                        ref={searchInputRef}
                        placeholder="Kartenname oder Nummer..."
                        value={searchQuery}
                        onChange={(e) => {
                            onSearchChange(e.target.value);
                            setSelectedResultIndex(0);
                        }}
                        onKeyDown={handleSearchKeyDown}
                    />
                    {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />}
                </div>
                {searchResults.length > 0 && (
                    <div className="max-h-64 overflow-y-auto rounded-lg border">
                        {searchResults.map((result, index) => (
                            <div
                                key={`${result.id}-${result.is_custom ? 'custom' : 'regular'}`}
                                className={`flex cursor-pointer items-center gap-3 p-2 hover:bg-muted ${index === selectedResultIndex ? 'bg-muted' : ''}`}
                                onClick={() => onSelectCard(result)}
                            >
                                <CardImage
                                    src={result.image_url}
                                    alt={result.card_name}
                                    className="h-12 w-9 rounded object-cover"
                                    placeholderClassName="h-12 w-9 rounded"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-1 font-medium">
                                        {result.card_name}
                                        {result.is_custom && (
                                            <Badge variant="secondary" className="px-1 text-[10px]">
                                                Custom
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {result.set_name} - {result.collector_number}
                                    </div>
                                </div>
                                {result.rarity && (
                                    <Badge variant="outline" className="text-xs">
                                        {getRarityLabel(result.rarity)}
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
