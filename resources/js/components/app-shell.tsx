import { SidebarProvider } from '@/components/ui/sidebar';
import { useState } from 'react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

// Read sidebar state from cookie directly on client to avoid server/client sync issues
function getSidebarStateFromCookie(): boolean {
    if (typeof document === 'undefined') return true;
    const match = document.cookie.match(/(?:^|; )sidebar_state=([^;]*)/);
    return !match || match[1] === 'true';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    // Read cookie value once on mount to avoid re-renders
    const [isOpen] = useState(getSidebarStateFromCookie);

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    return <SidebarProvider defaultOpen={isOpen}>{children}</SidebarProvider>;
}
