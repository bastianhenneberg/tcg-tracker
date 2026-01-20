import { cn } from '@/lib/utils';
import { UnifiedPrinting } from '@/types/unified';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useRef } from 'react';
import { CardThumbnail } from './card-thumbnail';

interface DraggableSearchCardProps {
    printing: UnifiedPrinting;
    onDirectAdd?: (printing: UnifiedPrinting) => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Prefix for search card IDs to distinguish from deck card IDs
export const SEARCH_CARD_ID_PREFIX = 'search-';

export function DraggableSearchCard({ printing, onDirectAdd, className, size = 'md' }: DraggableSearchCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `${SEARCH_CARD_ID_PREFIX}${printing.id}`,
        data: {
            type: 'search',
            printing,
        },
    });

    // Track if user is dragging to distinguish from click
    const isDraggingRef = useRef(false);
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

    const style = transform
        ? {
              transform: CSS.Translate.toString(transform),
              zIndex: 50,
          }
        : undefined;

    const handlePointerDown = (e: React.PointerEvent) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
        isDraggingRef.current = false;
        // Call the original listener
        listeners?.onPointerDown?.(e as unknown as PointerEvent);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        // Check if it was a click (minimal movement) vs drag
        if (pointerDownPos.current) {
            const dx = Math.abs(e.clientX - pointerDownPos.current.x);
            const dy = Math.abs(e.clientY - pointerDownPos.current.y);
            // If movement was less than 5px, treat as click
            if (dx < 5 && dy < 5 && !isDragging) {
                onDirectAdd?.(printing);
            }
        }
        pointerDownPos.current = null;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group relative cursor-grab transition-all duration-200',
                isDragging && 'opacity-50 scale-95',
                className
            )}
            {...listeners}
            {...attributes}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
        >
            <CardThumbnail
                printing={printing}
                size={size}
            />

            {/* Drag Hint Overlay */}
            <div
                className={cn(
                    'absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/60 transition-opacity duration-200',
                    'opacity-0 group-hover:opacity-100',
                    isDragging && 'opacity-0'
                )}
            >
                <GripVertical className="mb-1 h-5 w-5 text-white" />
                <span className="text-center text-[10px] font-medium text-white">
                    Ziehen oder<br />Klicken
                </span>
            </div>
        </div>
    );
}

// Helper to check if an ID is a search card ID
export function isSearchCardId(id: string | number): boolean {
    return typeof id === 'string' && id.startsWith(SEARCH_CARD_ID_PREFIX);
}

// Helper to extract printing ID from search card ID
export function extractPrintingIdFromSearchCardId(id: string): number | null {
    if (!isSearchCardId(id)) return null;
    const numStr = id.slice(SEARCH_CARD_ID_PREFIX.length);
    const num = parseInt(numStr, 10);
    return isNaN(num) ? null : num;
}
