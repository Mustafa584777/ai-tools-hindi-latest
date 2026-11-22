'use client';

import { useMemo, useRef, useEffect } from 'react';
import { stripTableOfContents, injectHeadingIdsForToc, extractTocFromHtml, sanitizeExternalLinks } from '@/lib/utils';
import { AiTool } from '@/lib/types';
import TableOfContents from '@/components/TableOfContents';
import ArticleToolsBox from '@/components/ArticleToolsBox';

function getProcessedContent(html: string): string {
  if (!html) return '';

  // 1. Strip any hardcoded TOC elements from legacy or WordPress content
  let cleaned = stripTableOfContents(html);

  // 2. Sanitize external links missing protocol
  cleaned = sanitizeExternalLinks(cleaned);

  // 3. Optimize every <img> tag:
  //    - 1st image (LCP): eager + fetchpriority="high" + skeleton shimmer until decoded
  //    - Subsequent images: loading="lazy" + decoding="async" + fetchpriority="low" + skeleton shimmer
  let imgIndex = 0;
  cleaned = cleaned.replace(/<img\b([^>]*)>/gi, (_match, rawAttrs: string) => {
    const isLcp = imgIndex === 0;
    imgIndex++;

    let attrs = rawAttrs
      .replace(/\s+(?:loading|fetchpriority|decoding|referrerpolicy)=["'][^"']*["']/gi, '')
      .trim();

    if (/class=["']([^"']*)["']/i.test(attrs)) {
      attrs = attrs.replace(/class=["']([^"']*)["']/i, 'class="$1 img-skeleton-loading"');
    } else {
      attrs = `${attrs} class="img-skeleton-loading"`.trim();
    }

    const perfAttrs = isLcp
      ? 'fetchpriority="high" loading="eager" decoding="async" referrerpolicy="no-referrer"'
      : 'loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer"';

    return `<img ${attrs} ${perfAttrs}>`;
  });

  // 4. Lazy-load embedded iframes
  cleaned = cleaned.replace(/<iframe\b(?![^>]*\bloading=)([^>]*)>/gi, '<iframe loading="lazy"$1>');

  // 5. Inject matching heading IDs with scroll offset for smooth Table of Contents navigation
  cleaned = injectHeadingIdsForToc(cleaned);

  return cleaned;
}

export default function ArticleContent({
  content,
  relevantTools = [],
}: {
  content: string;
  relevantTools?: AiTool[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const tocItems = useMemo(() => extractTocFromHtml(content), [content]);

  const { firstPart, bodySegments } = useMemo(() => {
    const html = getProcessedContent(content);
    if (!html) return { firstPart: '', bodySegments: [] as string[] };

    const pCloseRegex = /<\/p>/gi;
    let match;
    let pCount = 0;
    let splitIndex = -1;

    while ((match = pCloseRegex.exec(html)) !== null) {
      pCount++;
      if (pCount === 3) {
        splitIndex = pCloseRegex.lastIndex;
        break;
      }
    }

    let first = html;
    let rest = '';

    if (splitIndex !== -1) {
      first = html.substring(0, splitIndex);
      rest = html.substring(splitIndex);
    } else {
      pCloseRegex.lastIndex = 0;
      let lastPIndex = -1;
      while ((match = pCloseRegex.exec(html)) !== null) {
        lastPIndex = pCloseRegex.lastIndex;
      }
      if (lastPIndex !== -1) {
        first = html.substring(0, lastPIndex);
        rest = html.substring(lastPIndex);
      }
    }

    if (!rest) {
      return { firstPart: first, bodySegments: [] as string[] };
    }

    // Find safe </p> split boundaries in the remainder of the article
    const restPRegex = /<\/p>/gi;
    const pEnds: number[] = [];
    while ((match = restPRegex.exec(rest)) !== null) {
      pEnds.push(restPRegex.lastIndex);
    }

    if (pEnds.length < 3) {
      return { firstPart: first, bodySegments: [rest] };
    }

    const totalLen = rest.length;
    const pickClosest = (targetRatio: number, minIdx: number) => {
      const targetPos = Math.floor(totalLen * targetRatio);
      let best = -1;
      let bestDist = Infinity;
      for (const pos of pEnds) {
        if (pos <= minIdx + 160 || totalLen - pos < 120) continue;
        const dist = Math.abs(pos - targetPos);
        if (dist < bestDist) {
          bestDist = dist;
          best = pos;
        }
      }
      return best;
    };

    const split1 = pickClosest(0.38, 0);
    const split2 = split1 !== -1 ? pickClosest(0.74, split1) : -1;

    const segments: string[] = [];
    if (split1 !== -1 && split2 !== -1) {
      segments.push(rest.slice(0, split1), rest.slice(split1, split2), rest.slice(split2));
    } else if (split1 !== -1) {
      segments.push(rest.slice(0, split1), rest.slice(split1));
    } else {
      segments.push(rest);
    }

    return { firstPart: first, bodySegments: segments };
  }, [content]);

  const processedContentForEffect = useMemo(() => {
    return firstPart + (bodySegments.length > 0 ? '\n' + bodySegments.join('\n') : '');
  }, [firstPart, bodySegments]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const embeds = container.querySelectorAll('.lite-youtube-embed');
    const handlers: { el: Element; handler: () => void }[] = [];

    embeds.forEach((embed) => {
      const videoId = embed.getAttribute('data-video-id');
      if (!videoId) return;

      const handler = () => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('src', `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`);
        iframe.setAttribute('title', 'YouTube video player');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.className = 'w-full h-full absolute inset-0';
        embed.innerHTML = '';
        embed.appendChild(iframe);
      };

      embed.addEventListener('click', handler);
      handlers.push({ el: embed, handler });
    });

    const mediaVideoContainers = container.querySelectorAll('[data-media-video-id]');
    mediaVideoContainers.forEach(async (el) => {
      const mediaId = el.getAttribute('data-media-video-id');
      if (!mediaId) return;

      const videoEl = el.tagName === 'VIDEO' ? (el as HTMLVideoElement) : el.querySelector('video');
      const sourceEl = el.querySelector('source');
      const currentSrc = sourceEl?.getAttribute('src') || videoEl?.getAttribute('src');

      if (!currentSrc || !currentSrc.startsWith('data:video/')) {
        try {
          const { fetchMediaVideoFromFirestore } = await import('@/lib/storage');
          const base64 = await fetchMediaVideoFromFirestore(mediaId);
          if (base64) {
            if (sourceEl) {
              sourceEl.setAttribute('src', base64);
            } else if (videoEl) {
              videoEl.setAttribute('src', base64);
            }
            if (videoEl) {
              videoEl.load();
            }
          }
        } catch (e) {
          console.warn('Failed to load video chunk from Firestore:', mediaId, e);
        }
      }
    });

    const allImages = container.querySelectorAll<HTMLImageElement>('img:not([data-tool-logo="true"])');
    allImages.forEach((imgEl, idx) => {
      imgEl.setAttribute('referrerpolicy', 'no-referrer');
      if (idx === 0) {
        imgEl.setAttribute('fetchpriority', 'high');
        imgEl.setAttribute('loading', 'eager');
      } else {
        imgEl.setAttribute('loading', 'lazy');
        imgEl.setAttribute('decoding', 'async');
      }
      imgEl.classList.add('max-w-full', 'w-full', 'h-auto', 'object-cover', 'rounded-xl', 'mt-4', 'mb-[10px]', 'mx-auto');
      imgEl.style.maxWidth = '100%';
      imgEl.style.height = 'auto';
      imgEl.style.marginBottom = '10px';

      const markLoaded = () => {
        imgEl.classList.remove('img-skeleton-loading');
        imgEl.classList.add('img-skeleton-loaded');
      };

      if (imgEl.complete && imgEl.naturalWidth > 0) {
        markLoaded();
      } else {
        imgEl.classList.add('img-skeleton-loading');
        imgEl.addEventListener('load', markLoaded, { once: true });
      }

      let attempts = 0;
      imgEl.onerror = () => {
        attempts++;
        const currentSrc = imgEl.getAttribute('src') || '';

        imgEl.removeAttribute('srcset');
        imgEl.removeAttribute('sizes');

        if (attempts === 1) {
          if (currentSrc.startsWith('/wp-content/')) {
            imgEl.src = `https://aitoolhindi.online${currentSrc}`;
            return;
          }
          if (currentSrc.includes('aitoolhindi.online/wp-content/')) {
            const localSrc = currentSrc.replace(/^https?:\/\/[^/]+(\/wp-content\/.+)$/, '$1');
            if (localSrc !== currentSrc) {
              imgEl.src = localSrc;
              return;
            }
          }
        }

        if (attempts === 2 && currentSrc.startsWith('http')) {
          fetch(`/api/fetch-image?url=${encodeURIComponent(currentSrc)}`)
            .then(res => res.json())
            .then(data => {
              if (data.dataUrl) {
                imgEl.src = data.dataUrl;
              } else {
                imgEl.src = `https://picsum.photos/seed/${encodeURIComponent(imgEl.alt || 'aitoolhindi')}/800/450`;
              }
            })
            .catch(() => {
              imgEl.src = `https://picsum.photos/seed/${encodeURIComponent(imgEl.alt || 'aitoolhindi')}/800/450`;
            });
          return;
        }

        if (!imgEl.src.includes('picsum.photos')) {
          imgEl.src = `https://picsum.photos/seed/${encodeURIComponent(imgEl.alt || 'aitoolhindi')}/800/450`;
          imgEl.classList.add('opacity-90');
        } else {
          markLoaded();
        }
      };
    });

    const iframes = container.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      iframe.style.maxWidth = '100%';
      iframe.removeAttribute('width');
      iframe.classList.add('w-full', 'max-w-full', 'aspect-video', 'rounded-xl');
      const parent = iframe.parentElement;
      if (parent && (parent.classList.contains('wp-block-embed__wrapper') || parent.tagName === 'FIGURE')) {
        parent.style.maxWidth = '100%';
        parent.style.overflow = 'hidden';
      }
    });

    const tables = container.querySelectorAll('table');
    tables.forEach((table) => {
      if (!table.parentElement?.classList.contains('table-responsive-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive-wrapper w-full max-w-full overflow-x-auto my-6 border border-slate-200 rounded-xl shadow-sm';
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });

    const pres = container.querySelectorAll('pre');
    pres.forEach((pre) => {
      pre.classList.add('max-w-full', 'overflow-x-auto', 'whitespace-pre-wrap', 'break-words');
    });

    const mediaImages = container.querySelectorAll('img[data-media-image-id]');
    mediaImages.forEach(async (imgEl) => {
      const mediaId = imgEl.getAttribute('data-media-image-id');
      if (!mediaId) return;
      const currentSrc = imgEl.getAttribute('src');
      if (!currentSrc || !currentSrc.startsWith('data:image/')) {
        try {
          const { fetchMediaImageFromFirestore } = await import('@/lib/storage');
          const base64 = await fetchMediaImageFromFirestore(mediaId);
          if (base64) {
            imgEl.setAttribute('src', base64);
          }
        } catch (e) {
          console.warn('Failed to load image chunk from Firestore:', mediaId, e);
        }
      }
    });

    return () => {
      handlers.forEach(({ el, handler }) => {
        el.removeEventListener('click', handler);
      });
    };
  }, [processedContentForEffect]);

  return (
    <div 
      ref={containerRef}
      className="prose prose-slate max-w-none text-black leading-relaxed space-y-4 text-base md:text-lg font-medium w-full max-w-full break-words [overflow-wrap:anywhere] overflow-hidden [&_p]:mb-[25px] [&>h1]:text-2xl [&>h1]:md:text-3xl [&>h1]:font-extrabold [&>h1]:text-black [&>h1]:pt-4 [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-extrabold [&_h2]:text-black [&_h2]:mt-8 [&_h2]:mb-4 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:text-black [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_ol]:my-4 [&_li]:my-1 [&>blockquote]:border-l-4 [&>blockquote]:border-orange-600 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-black [&>blockquote]:my-4 [&>blockquote]:bg-orange-50/50 [&>blockquote]:py-3 [&>blockquote]:rounded-r-xl"
    >
      <div dangerouslySetInnerHTML={{ __html: firstPart }} />
      <TableOfContents items={tocItems} />
      {relevantTools[0] && <ArticleToolsBox tool={relevantTools[0]} />}

      {bodySegments.map((segmentHtml, idx) => (
        <div key={idx}>
          <div dangerouslySetInnerHTML={{ __html: segmentHtml }} />
          {idx === 0 && relevantTools[1] && bodySegments.length > 1 && (
            <ArticleToolsBox tool={relevantTools[1]} />
          )}
          {idx === 1 && relevantTools[2] && bodySegments.length > 2 && (
            <ArticleToolsBox tool={relevantTools[2]} />
          )}
          {idx === bodySegments.length - 1 && bodySegments.length === 1 && relevantTools[1] && (
            <ArticleToolsBox tool={relevantTools[1]} />
          )}
        </div>
      ))}
    </div>
  );
}
