import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UnifiedPrinting } from '@/types/unified';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';

type CardSize = 'sm' | 'md' | 'lg' | 'xl' | 'fill';

interface CardThumbnailProps {
    printing: UnifiedPrinting;
    size?: CardSize;
    showQuantity?: number;
    className?: string;
    onClick?: () => void;
}

const sizeClasses: Record<CardSize, { container: string; text: string; badge: string }> = {
    sm: {
        container: 'w-16',
        text: 'text-[10px]',
        badge: 'text-[10px] h-4 min-w-4 px-1',
    },
    md: {
        container: 'w-24',
        text: 'text-xs',
        badge: 'text-xs h-5 min-w-5 px-1.5',
    },
    lg: {
        container: 'w-36',
        text: 'text-sm',
        badge: 'text-sm h-6 min-w-6 px-2',
    },
    xl: {
        container: 'w-52',
        text: 'text-base',
        badge: 'text-base h-7 min-w-7 px-2.5',
    },
    // Flexible size that fills parent container
    fill: {
        container: 'w-full',
        text: 'text-sm',
        badge: 'text-sm h-6 min-w-6 px-2',
    },
};

export function CardThumbnail({ printing, size = 'md', showQuantity, className, onClick }: CardThumbnailProps) {
    const [imageError, setImageError] = useState(false);
    const imageUrl = printing.image_url_small || printing.image_url;
    const cardName = printing.card?.name || 'Unknown Card';
    const sizeConfig = sizeClasses[size];

    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-lg transition-all duration-200',
                'shadow-sm ring-1 ring-black/10 dark:ring-white/10',
                'hover:scale-105 hover:shadow-lg hover:z-10',
                'cursor-pointer',
                sizeConfig.container,
                className
            )}
            onClick={onClick}
        >
            {/* Card Image or Fallback */}
            {imageUrl && !imageError ? (
                <img
                    src={imageUrl}
                    alt={cardName}
                    className="aspect-[2.5/3.5] w-full rounded-lg object-cover"
                    onError={() => setImageError(true)}
                    loading="lazy"
                />
            ) : (
                <div className="bg-muted flex aspect-[2.5/3.5] w-full flex-col items-center justify-center rounded-lg border border-dashed p-2">
                    <ImageOff className="text-muted-foreground mb-1 h-4 w-4" />
                    <span className={cn('text-muted-foreground line-clamp-3 text-center', sizeConfig.text)}>
                        {cardName}
                    </span>
                </div>
            )}

            {/* Quantity Badge */}
            {showQuantity !== undefined && showQuantity > 0 && (
                <Badge
                    className={cn(
                        'absolute right-1 top-1 shadow-md',
                        sizeConfig.badge
                    )}
                >
                    x{showQuantity}
                </Badge>
            )}

            {/* Hover Overlay (subtle) */}
            <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-transparent transition-all duration-200 group-hover:ring-primary/50" />
        </div>
    );
}

// Skeleton version for loading states
export function CardThumbnailSkeleton({ size = 'md', className }: { size?: CardSize; className?: string }) {
    const sizeConfig = sizeClasses[size];

    return (
        <div className={cn('animate-pulse', sizeConfig.container, className)}>
            <div className="bg-muted aspect-[2.5/3.5] w-full rounded-lg" />
        </div>
    );
}
