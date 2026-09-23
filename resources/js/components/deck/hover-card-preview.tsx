import { UnifiedPrinting } from '@/types/unified';
import { Eye } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface HoverCardPreviewProps {
    printing: UnifiedPrinting;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    showEyeIcon?: boolean;
}

interface PreviewPosition {
    left: number;
    top: number;
}

export function HoverCardPreview({
    printing,
    children,
    onClick,
    className = '',
    showEyeIcon = true,
}: HoverCardPreviewProps) {
    const [previewPosition, setPreviewPosition] =
        useState<PreviewPosition | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const calculatePosition = useCallback(() => {
        if (!containerRef.current) return null;

        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const previewWidth = 256; // w-64 = 16rem = 256px
        const previewHeight = 358; // approximate aspect ratio 2.5:3.5

        let left: number;
        let top: number;

        // Position horizontally - prefer right, but flip to left if no room
        if (rect.right + previewWidth + 16 < viewportWidth) {
            left = rect.right + 12;
        } else {
            left = rect.left - previewWidth - 12;
        }

        // Position vertically - try to center on the card, but keep within viewport
        top = rect.top + rect.height / 2 - previewHeight / 2;

        // Keep within vertical bounds
        if (top < 8) {
            top = 8;
        } else if (top + previewHeight > viewportHeight - 8) {
            top = viewportHeight - previewHeight - 8;
        }

        return { left, top };
    }, []);

    const handleMouseEnter = useCallback(() => {
        const position = calculatePosition();
        if (position) {
            setPreviewPosition(position);
        }
    }, [calculatePosition]);

    const handleMouseLeave = useCallback(() => {
        setPreviewPosition(null);
    }, []);

    return (
        <div
            ref={containerRef}
            className={`group relative w-fit cursor-pointer ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
        >
            {children}

            {/* Hover overlay with eye icon */}
            {showEyeIcon && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition-colors group-hover:bg-black/20 group-hover:opacity-100">
                    <Eye className="h-6 w-6 text-white drop-shadow-lg" />
                </div>
            )}

            {/* Hover preview - rendered via portal to body */}
            {previewPosition &&
                printing.image_url &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="pointer-events-none"
                        style={{
                            position: 'fixed',
                            left: previewPosition.left,
                            top: previewPosition.top,
                            zIndex: 9999,
                        }}
                    >
                        <img
                            src={printing.image_url}
                            alt={printing.card?.name}
                            className="h-auto w-64 rounded-lg shadow-2xl ring-2 ring-white/20"
                        />
                    </div>,
                    document.body,
                )}
        </div>
    );
}
