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
import { Archive, BookOpen, Camera, Database, Folder, Gamepad2, Heart, Layers, LayoutGrid, Library, Package, PenSquare, Sparkles, Target } from 'lucide-react';
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
        title: 'Scanner',
        href: '/scanner',
        icon: Camera,
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

// Helper to generate nav items for a game
const getGameNavItems = (slug: string, hasCustomCards = true): NavItem[] => {
    const items: NavItem[] = [
        {
            title: 'Scanner',
            href: `/scanner?game=${slug}`,
            icon: Camera,
        },
        {
            title: 'Inventar',
            href: `/g/${slug}/inventory`,
            icon: Package,
        },
        {
            title: 'Sammlung',
            href: `/g/${slug}/collection`,
            icon: Heart,
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
    ];

    if (hasCustomCards) {
        items.push({
            title: 'Eigene Karten',
            href: `/custom-cards?game=${slug}`,
            icon: PenSquare,
        });
    }

    return items;
};

const fabNavItems = getGameNavItems('fab');
const mtgNavItems = getGameNavItems('magic-the-gathering');
const riftboundNavItems = getGameNavItems('riftbound');
const onepieceNavItems = getGameNavItems('onepiece', false);

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
                    <NavGroup key={game.id} label={game.name} items={getGameNavItems(game.slug)} />
                ))}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
