import { ImageOff } from 'lucide-react';
import { useState } from 'react';

interface CardImageProps {
    src: string | null | undefined;
    alt: string;
    className?: string;
    placeholderClassName?: string;
}

export function CardImage({ src, alt, className = '', placeholderClassName = '' }: CardImageProps) {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div
                className={`flex items-center justify-center bg-muted ${placeholderClassName || className}`}
            >
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs">Kein Bild</span>
                </div>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setError(true)}
        />
    );
}
