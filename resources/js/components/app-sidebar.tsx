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
import { Link } from '@inertiajs/react';
import { Archive, BookOpen, Camera, Database, Folder, Heart, Layers, LayoutGrid, Package } from 'lucide-react';
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
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
