'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { resolveDisplayImageUrl } from '@/lib/utils';

interface BlogImageProps {
  src: string | undefined | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackSrc?: string;
}

export default function BlogImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className = '',
  sizes = '(max-width: 768px) 100vw, 400px',
  priority = false,
  fallbackSrc = 'https://picsum.photos/seed/articledefault/800/450',
}: BlogImageProps) {
  const resolved = resolveDisplayImageUrl(src);
  const [overrideSrc, setOverrideSrc] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const currentSrc = overrideSrc || resolved;
  const isDataUrl = currentSrc.startsWith('data:') || currentSrc.startsWith('blob:');

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  const handleError = () => {
    if (retryCount === 0) {
      setRetryCount(1);
      if (currentSrc.startsWith('/wp-content/')) {
        setOverrideSrc(`https://aitoolhindi.online${currentSrc}`);
        return;
      }
      if (currentSrc.includes('aitoolhindi.online/wp-content/')) {
        const local = currentSrc.replace(/^https?:\/\/[^/]+(\/wp-content\/.+)$/, '$1');
        if (local !== currentSrc) {
          setOverrideSrc(local);
          return;
        }
      }
    }

    if (currentSrc !== fallbackSrc) {
      setOverrideSrc(fallbackSrc);
    } else {
      setIsLoaded(true);
    }
  };

  const imageElement = (
    <Image
      ref={imgRef}
      src={currentSrc}
      alt={alt || 'AI tutorial thumbnail'}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      sizes={sizes}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'low'}
      decoding="async"
      unoptimized={isDataUrl}
      referrerPolicy="no-referrer"
      onLoad={() => setIsLoaded(true)}
      onError={handleError}
    />
  );

  if (fill) {
    return (
      <>
        {!isLoaded && (
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse pointer-events-none"
          />
        )}
        {imageElement}
      </>
    );
  }

  return (
    <span className="relative inline-block overflow-hidden">
      {!isLoaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse pointer-events-none"
        />
      )}
      {imageElement}
    </span>
  );
}
