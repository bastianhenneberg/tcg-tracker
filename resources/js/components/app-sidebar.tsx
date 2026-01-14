import { GameSwitcher, useSelectedGame } from '@/components/game-switcher';
import { NavGroup, NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as boxesIndex } from '@/routes/boxes';
import { index as lotsIndex } from '@/routes/lots';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { Archive, Camera, Database, Gamepad2, GitMerge, Heart, Keyboard, Layers, LayoutGrid, Library, Package, PenSquare, Sparkles, Target } from 'lucide-react';
import { useMemo } from 'react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Kartons',
        href: boxesIndex(),
        icon: Archive,
    },
    {
        title: 'Lots',
        href: lotsIndex(),
        icon: Layers,
        prefetch: false, // Always load fresh data
    },
    {
        title: 'Spiele verwalten',
        href: '/settings/games',
        icon: Gamepad2,
    },
    {
        title: 'Playset-Regeln',
        href: '/settings/playset-rules',
        icon: Target,
    },
    {
        title: 'Data Mappings',
        href: '/data-mappings',
        icon: GitMerge,
    },
];

// Helper to generate nav items for a game
const getGameNavItems = (slug: string): NavItem[] => [
    {
        title: 'Scanner',
        href: `/scanner?game=${slug}`,
        icon: Camera,
    },
    {
        title: 'Quick Add',
        href: `/quick-add?game=${slug}`,
        icon: Keyboard,
    },
    {
        title: 'Inventar',
        href: `/g/${slug}/inventory`,
        icon: Package,
        prefetch: false, // Always load fresh data
    },
    {
        title: 'Sammlung',
        href: `/g/${slug}/collection`,
        icon: Heart,
        prefetch: false, // Always load fresh data
    },
    {
        title: 'Kartendatenbank',
        href: `/g/${slug}/cards`,
        icon: Database,
    },
    {
        title: 'Sets',
        href: `/g/${slug}/sets`,
        icon: Library,
    },
    {
        title: 'Printings',
        href: `/g/${slug}/printings`,
        icon: Sparkles,
    },
    {
        title: 'Eigene Karten',
        href: `/custom-cards?game=${slug}`,
        icon: PenSquare,
    },
];


export function AppSidebar() {
    const { selectedGame, selectedSlug, setSelectedGame, allGames } = useSelectedGame();

    const gameNavItems = useMemo(
        () => getGameNavItems(selectedSlug),
        [selectedSlug]
    );

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <GameSwitcher
                    selectedSlug={selectedSlug}
                    onSelect={setSelectedGame}
                    games={allGames}
                />
                <SidebarSeparator />
                <NavGroup label={selectedGame.name} items={gameNavItems} />
                <SidebarSeparator />
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
