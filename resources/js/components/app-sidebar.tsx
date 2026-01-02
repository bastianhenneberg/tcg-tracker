import { NavFooter } from '@/components/nav-footer';
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
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as boxesIndex } from '@/routes/boxes';
import { index as lotsIndex } from '@/routes/lots';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Archive, BookOpen, Camera, Database, Folder, Gamepad2, Heart, Layers, LayoutGrid, Library, Package, PenSquare, Settings, Sparkles, Target } from 'lucide-react';
import AppLogo from './app-logo';

interface CustomGame {
    id: number;
    name: string;
    slug: string;
}

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
    },
    {
        title: 'Spiele',
        href: '/settings/games',
        icon: Gamepad2,
    },
    {
        title: 'Playset-Regeln',
        href: '/settings/playset-rules',
        icon: Target,
    },
];

const fabNavItems: NavItem[] = [
    {
        title: 'Scanner',
        href: '/fab/scanner',
        icon: Camera,
    },
    {
        title: 'Inventar',
        href: '/fab/inventory',
        icon: Package,
    },
    {
        title: 'Sammlung',
        href: '/fab/collection',
        icon: Heart,
    },
    {
        title: 'Kartendatenbank',
        href: '/fab/cards',
        icon: Database,
    },
    {
        title: 'Eigene Karten',
        href: '/custom-cards?game=fab',
        icon: PenSquare,
    },
];

const mtgNavItems: NavItem[] = [
    {
        title: 'Scanner',
        href: '/mtg/scanner',
        icon: Camera,
    },
    {
        title: 'Inventar',
        href: '/mtg/inventory',
        icon: Package,
    },
    {
        title: 'Sammlung',
        href: '/mtg/collection',
        icon: Heart,
    },
    {
        title: 'Kartendatenbank',
        href: '/mtg/cards',
        icon: Database,
    },
    {
        title: 'Sets',
        href: '/mtg/sets',
        icon: Library,
    },
    {
        title: 'Printings',
        href: '/mtg/printings',
        icon: Sparkles,
    },
    {
        title: 'Eigene Karten',
        href: '/custom-cards?game=magic-the-gathering',
        icon: PenSquare,
    },
];

const riftboundNavItems: NavItem[] = [
    {
        title: 'Scanner',
        href: '/riftbound/scanner',
        icon: Camera,
    },
    {
        title: 'Inventar',
        href: '/riftbound/inventory',
        icon: Package,
    },
    {
        title: 'Sammlung',
        href: '/riftbound/collection',
        icon: Heart,
    },
    {
        title: 'Kartendatenbank',
        href: '/riftbound/cards',
        icon: Database,
    },
    {
        title: 'Eigene Karten',
        href: '/custom-cards?game=riftbound',
        icon: PenSquare,
    },
];

const onepieceNavItems: NavItem[] = [
    {
        title: 'Scanner',
        href: '/onepiece/scanner',
        icon: Camera,
    },
    {
        title: 'Inventar',
        href: '/onepiece/inventory',
        icon: Package,
    },
    {
        title: 'Sammlung',
        href: '/onepiece/collection',
        icon: Heart,
    },
    {
        title: 'Kartendatenbank',
        href: '/onepiece/cards',
        icon: Database,
    },
    {
        title: 'Printings',
        href: '/onepiece/printings',
        icon: Sparkles,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { customGames } = usePage<{ customGames: CustomGame[] }>().props;

    // Generate nav items for each custom game
    const getCustomGameNavItems = (game: CustomGame): NavItem[] => [
        {
            title: 'Scanner',
            href: `/games/${game.slug}/scanner`,
            icon: Camera,
        },
        {
            title: 'Inventar',
            href: `/games/${game.slug}/inventory`,
            icon: Package,
        },
        {
            title: 'Sammlung',
            href: `/games/${game.slug}/collection`,
            icon: Heart,
        },
        {
            title: 'Kartendatenbank',
            href: `/games/${game.slug}/cards`,
            icon: Database,
        },
        {
            title: 'Eigene Karten',
            href: `/custom-cards?game=${game.slug}`,
            icon: PenSquare,
        },
    ];

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
                <NavMain items={mainNavItems} />
                <NavGroup label="Flesh and Blood" items={fabNavItems} />
                <NavGroup label="Magic: The Gathering" items={mtgNavItems} />
                <NavGroup label="Riftbound" items={riftboundNavItems} />
                <NavGroup label="One Piece" items={onepieceNavItems} />
                {customGames?.map((game) => (
                    <NavGroup key={game.id} label={game.name} items={getCustomGameNavItems(game)} />
                ))}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
