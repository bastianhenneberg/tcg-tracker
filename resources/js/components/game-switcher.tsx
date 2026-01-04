import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePage } from '@inertiajs/react';
import { Gamepad2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface GameOption {
    slug: string;
    name: string;
    isOfficial: boolean;
}

interface CustomGame {
    id: number;
    name: string;
    slug: string;
}

const OFFICIAL_GAMES: GameOption[] = [
    { slug: 'fab', name: 'Flesh and Blood', isOfficial: true },
    { slug: 'magic-the-gathering', name: 'Magic: The Gathering', isOfficial: true },
    { slug: 'riftbound', name: 'Riftbound', isOfficial: true },
    { slug: 'onepiece', name: 'One Piece', isOfficial: true },
];

const STORAGE_KEY = 'tcg-tracker-selected-game';

export function useSelectedGame() {
    const { customGames } = usePage<{ customGames?: CustomGame[] }>().props;

    const allGames: GameOption[] = [
        ...OFFICIAL_GAMES,
        ...(customGames?.map(g => ({ slug: g.slug, name: g.name, isOfficial: false })) ?? []),
    ];

    const [selectedSlug, setSelectedSlug] = useState<string>(() => {
        if (typeof window === 'undefined') return 'fab';
        return localStorage.getItem(STORAGE_KEY) ?? 'fab';
    });

    const selectedGame = allGames.find(g => g.slug === selectedSlug) ?? allGames[0];

    const setSelectedGame = (slug: string) => {
        setSelectedSlug(slug);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, slug);
        }
    };

    // Sync with localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored !== selectedSlug) {
            setSelectedSlug(stored);
        }
    }, []);

    return {
        selectedGame,
        selectedSlug,
        setSelectedGame,
        allGames,
    };
}

interface GameSwitcherProps {
    selectedSlug: string;
    onSelect: (slug: string) => void;
    games: GameOption[];
}

export function GameSwitcher({ selectedSlug, onSelect, games }: GameSwitcherProps) {
    const selectedGame = games.find(g => g.slug === selectedSlug);

    return (
        <div className="px-2 py-2 overflow-hidden">
            <Select value={selectedSlug} onValueChange={onSelect}>
                <SelectTrigger className="w-full min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <Gamepad2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                            {selectedGame?.name ?? 'Spiel wählen'}
                        </span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {games.filter(g => g.isOfficial).length > 0 && (
                        <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                Offizielle Spiele
                            </div>
                            {games.filter(g => g.isOfficial).map((game) => (
                                <SelectItem key={game.slug} value={game.slug}>
                                    {game.name}
                                </SelectItem>
                            ))}
                        </>
                    )}
                    {games.filter(g => !g.isOfficial).length > 0 && (
                        <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                                Eigene Spiele
                            </div>
                            {games.filter(g => !g.isOfficial).map((game) => (
                                <SelectItem key={game.slug} value={game.slug}>
                                    {game.name}
                                </SelectItem>
                            ))}
                        </>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
