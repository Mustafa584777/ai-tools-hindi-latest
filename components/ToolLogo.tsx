'use client';

import { useState } from 'react';
import { AiTool } from '@/lib/types';

interface ToolLogoProps {
  tool: Pick<AiTool, 'name' | 'websiteUrl' | 'logoUrl' | 'logoText' | 'accentColor'>;
  size?: 'sm' | 'md' | 'lg';
}

function getFaviconUrl(websiteUrl?: string): string {
  if (!websiteUrl) return '';
  try {
    const host = new URL(websiteUrl).hostname.replace(/^www\./, '');
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return '';
  }
}

export default function ToolLogo({ tool, size = 'md' }: ToolLogoProps) {
  const initialSrc = tool.logoUrl || getFaviconUrl(tool.websiteUrl);
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [failed, setFailed] = useState<boolean>(!initialSrc);

  const sizeClasses =
    size === 'lg'
      ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-2.5'
      : size === 'sm'
        ? 'w-9 h-9 rounded-xl p-1.5'
        : 'w-11 h-11 sm:w-12 sm:h-12 rounded-xl p-1.5';

  const textSizeClass =
    size === 'lg' ? 'text-xl sm:text-2xl' : size === 'sm' ? 'text-xs' : 'text-sm';

  if (failed || !imgSrc) {
    return (
      <div
        className={`${sizeClasses} flex items-center justify-center text-white font-extrabold ${textSizeClass} tracking-tight shrink-0 shadow-xs`}
        style={{ backgroundColor: tool.accentColor || '#ea580c' }}
        aria-hidden="true"
      >
        {tool.logoText || tool.name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={`${tool.name} logo`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain !mb-0 !rounded-lg"
        onError={() => {
          const fallbackFavicon = getFaviconUrl(tool.websiteUrl);
          if (fallbackFavicon && imgSrc !== fallbackFavicon) {
            setImgSrc(fallbackFavicon);
          } else {
            setFailed(true);
          }
        }}
      />
    </div>
  );
}
