import fs from 'fs';
import path from 'path';
import { BlogPost } from './types';
import { cleanPostForExport } from './postClean';

let cachedWpFiles: Set<string> | null = null;
let cachedPosts: BlogPost[] | null = null;
let cachedPostsMtimeMs = 0;

function getLocalWpFiles(): Set<string> {
  if (cachedWpFiles) return cachedWpFiles;

  const files = new Set<string>();
  const wpRoot = path.join(process.cwd(), 'public', 'wp-content');

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const rel = '/' + path.relative(path.join(process.cwd(), 'public'), fullPath).replace(/\\/g, '/');
        files.add(rel);
      }
    }
  }

  try {
    walk(wpRoot);
  } catch {}

  cachedWpFiles = files;
  return files;
}

/**
 * Resolves a WordPress URL to local static `/wp-content/...` ONLY when the file actually exists
 * under `public/wp-content/`. Otherwise keeps `https://aitoolhindi.online/wp-content/...`
 * so the browser/Next Image never triggers wasted local 404 roundtrips.
 */
function resolveWpMediaPath(rawUrl: string, localFiles: Set<string>): string {
  if (!rawUrl) return rawUrl;
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/^(?:https?:\/\/(?:www\.)?aitoolhindi\.online)?(\/wp-content\/[^\s"'<>]+)$/i);
  if (!match || !match[1]) return rawUrl;

  const localRelPath = match[1].split('?')[0];
  if (localFiles.has(localRelPath)) {
    return localRelPath;
  }
  return `https://aitoolhindi.online${localRelPath}`;
}

function normalizePostMediaUrls(post: BlogPost, localFiles: Set<string>): BlogPost {
  const image = resolveWpMediaPath(post.image, localFiles);
  let content = post.content || '';

  if (content) {
    content = content.replace(
      /(?:https?:\/\/(?:www\.)?aitoolhindi\.online)?(\/wp-content\/[^\s"'<>,]+)/gi,
      (_full, wpPath: string) => {
        const cleanPath = wpPath.split('?')[0];
        if (localFiles.has(cleanPath)) {
          return cleanPath;
        }
        return `https://aitoolhindi.online${cleanPath}`;
      }
    );
  }

  return {
    ...post,
    image,
    content,
  };
}

export function invalidatePostsCache() {
  cachedPosts = null;
  cachedPostsMtimeMs = 0;
}

export function getAllPostsServer(): BlogPost[] {
  try {
    const dataFilePath = path.join(process.cwd(), 'data', 'posts.json');
    if (fs.existsSync(dataFilePath)) {
      const stat = fs.statSync(dataFilePath);
      if (cachedPosts && cachedPostsMtimeMs === stat.mtimeMs && process.env.NODE_ENV === 'production') {
        return cachedPosts;
      }

      const content = fs.readFileSync(dataFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const localFiles = getLocalWpFiles();
        const cleaned = parsed.map((p) =>
          normalizePostMediaUrls(cleanPostForExport(p as BlogPost), localFiles)
        );
        cachedPosts = cleaned;
        cachedPostsMtimeMs = stat.mtimeMs;
        return cleaned;
      }
    }
  } catch {}

  return [];
}

export function getPublishedPostsServer(): BlogPost[] {
  return getAllPostsServer().filter((p) => p.status !== 'draft');
}
