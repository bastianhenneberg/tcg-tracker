import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';

interface Notification {
    id: string;
    action: string | null;
    message: string;
    url: string | null;
    meta: Record<string, unknown>;
    read: boolean;
    created_at: string;
}

interface PageProps {
    notifications: {
        items: Notification[];
        unread_count: number;
    };
}

export function NotificationBell() {
    const { notifications } = usePage<PageProps>().props;
    const [open, setOpen] = useState(false);

    const markAsRead = (id: string) => {
        router.post(`/notifications/${id}/read`, {}, {
            preserveScroll: true,
        });
    };

    const markAllAsRead = () => {
        router.post('/notifications/read-all', {}, {
            preserveScroll: true,
        });
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        if (notification.url) {
            router.visit(notification.url);
            setOpen(false);
        }
    };

    const getActionIcon = (action: string | null) => {
        switch (action) {
            case 'confirm_cards':
                return '+';
            case 'mark_sold':
                return '$';
            case 'move_to_collection':
                return '~';
            case 'delete_cards':
                return '-';
            default:
                return '*';
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative group h-9 w-9 cursor-pointer"
                >
                    <Bell className="!size-5 opacity-80 group-hover:opacity-100" />
                    {notifications.unread_count > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-xs"
                        >
                            {notifications.unread_count > 9 ? '9+' : notifications.unread_count}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
                <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="font-medium">Benachrichtigungen</span>
                    {notifications.unread_count > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={markAllAsRead}
                        >
                            <CheckCheck className="mr-1 h-3 w-3" />
                            Alle gelesen
                        </Button>
                    )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {notifications.items.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            Keine Benachrichtigungen
                        </div>
                    ) : (
                        notifications.items.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex cursor-pointer items-start gap-3 p-3 ${
                                    !notification.read ? 'bg-muted/50' : ''
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                    {getActionIcon(notification.action)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {notification.created_at}
                                    </p>
                                </div>
                                {!notification.read && (
                                    <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
