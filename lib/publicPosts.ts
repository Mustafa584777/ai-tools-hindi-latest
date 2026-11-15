import { BlogPost } from './types';
import articlesBackup from '../data/posts.json';
import { stripTableOfContents } from './utils';

export const INITIAL_BLOG_POSTS: BlogPost[] = ((articlesBackup as unknown as BlogPost[]) || []).map(p => ({
  ...p,
  content: stripTableOfContents(p.content)
}));

const PUBLIC_CACHE_KEY = 'aitoolhindi_public_posts_v5';

/**
 * Public consumer site loader:
 * Strictly reads from posts.json (API or disk backup).
 * NEVER touches Firebase, ensuring zero latency, zero quota, and pure posts.json delivery.
 */
const PUBLIC_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PUBLIC_CACHE_TS_KEY = 'aitoolhindi_public_posts_ts_v5';

export async function fetchBlogPostsFromDisk(): Promise<BlogPost[]> {
  if (typeof window !== 'undefined') {
    try {
      const ts = Number(localStorage.getItem(PUBLIC_CACHE_TS_KEY) || '0');
      const cached = localStorage.getItem(PUBLIC_CACHE_KEY);
      if (cached && ts && Date.now() - ts < PUBLIC_CACHE_TTL_MS) {
        const parsed: BlogPost[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/articles');
    if (res.ok) {
      const data = await res.json();
      if (data.posts && Array.isArray(data.posts) && data.posts.length > 0) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(data.posts));
            localStorage.setItem(PUBLIC_CACHE_TS_KEY, String(Date.now()));
          } catch {}
        }
        return data.posts;
      }
    }
  } catch (err) {
    console.warn('API fetch warning:', err);
  }

  // Fallback strictly to INITIAL_BLOG_POSTS (posts.json) if offline or API unreachable
  return INITIAL_BLOG_POSTS;
}

export function getStoredBlogPostsSync(): BlogPost[] {
  const validSlugs = new Set(INITIAL_BLOG_POSTS.map(p => p.slug));
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(PUBLIC_CACHE_KEY);
      if (cached) {
        const posts: BlogPost[] = JSON.parse(cached);
        if (Array.isArray(posts) && posts.length > 0) {
          const filtered = posts.filter(p => validSlugs.has(p.slug));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
  }
  return INITIAL_BLOG_POSTS;
}
