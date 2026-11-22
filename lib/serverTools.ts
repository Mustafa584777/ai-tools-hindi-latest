import fs from 'fs';
import path from 'path';
import { AiTool, BlogPost } from './types';

function readToolsFile(): AiTool[] {
  try {
    const filePath = path.join(process.cwd(), 'data', 'tools.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as AiTool[];
      }
    }
  } catch (err) {
    console.warn('Failed to read tools.json:', err);
  }
  return [];
}

export function getAllToolsServer(): AiTool[] {
  const tools = readToolsFile();
  return [...tools].sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) {
      return a.featured ? -1 : 1;
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

export function getToolBySlugServer(slug: string): AiTool | null {
  const clean = decodeURIComponent(slug).replace(/\/+$/, '').trim().toLowerCase();
  const tools = readToolsFile();
  return (
    tools.find(
      (t) =>
        t.slug.toLowerCase() === clean ||
        t.id.toLowerCase() === clean ||
        t.id.toLowerCase() === `tool-${clean}` ||
        t.name.toLowerCase().replace(/\s+/g, '-') === clean
    ) || null
  );
}

/**
 * Automatically selects 2-3 most relevant AI tools for any blog article
 * using manual overrides first, then weighted keyword + category matching.
 */
export function getRelevantToolsForPost(post: BlogPost, maxCount = 3): AiTool[] {
  const tools = getAllToolsServer();
  if (tools.length === 0) return [];

  // 1. Respect explicit admin overrides if present
  if (Array.isArray(post.recommendedTools) && post.recommendedTools.length > 0) {
    const manual = post.recommendedTools
      .map((s) => tools.find((t) => t.slug.toLowerCase() === s.toLowerCase()))
      .filter((t): t is AiTool => Boolean(t));
    if (manual.length >= maxCount) {
      return manual.slice(0, maxCount);
    }
  }

  const titleLower = `${post.title || ''} ${post.slug || ''}`.toLowerCase();
  const catLower = (post.category || '').toLowerCase();
  const bodySnippet = (post.content || '').replace(/<[^>]+>/g, ' ').slice(0, 2500).toLowerCase();
  const combined = `${titleLower} ${catLower} ${bodySnippet}`;

  const scored = tools.map((tool) => {
    let score = 0;
    const toolName = tool.name.toLowerCase();
    const toolSlug = tool.slug.toLowerCase().replace(/-/g, ' ');

    // Strong title/slug match
    if (titleLower.includes(toolName) || titleLower.includes(toolSlug)) {
      score += 40;
    }
    if (bodySnippet.includes(toolName)) {
      score += 15;
    }

    // Tag matches
    for (const tag of tool.tags || []) {
      const t = tag.toLowerCase();
      if (titleLower.includes(t)) score += 18;
      else if (combined.includes(t)) score += 6;
    }

    // Category affinity
    if (catLower.includes('image') && tool.category === 'Image Generation') score += 20;
    if (catLower.includes('video') && tool.category === 'Video Generation') score += 20;
    if (catLower.includes('coding') && tool.category === 'Coding & Dev') score += 20;
    if (catLower.includes('audio') && tool.category === 'Audio & Voice') score += 22;
    if (catLower.includes('llm') && tool.category === 'AI Chatbots') score += 16;
    if (catLower.includes('best ai tools') && tool.featured) score += 10;

    // Specific Hindi/Hinglish topic keywords
    if (/photo|image|thumbnail|logo|editing|4k|hd|kapde|watermark/.test(titleLower)) {
      if (['google-gemini', 'midjourney', 'leonardo-ai', 'canva-ai', 'ideogram'].includes(tool.slug)) {
        score += 14;
      }
    }
    if (/video|drone|reels|avatar/.test(titleLower)) {
      if (['runway', 'kling-ai', 'heygen', 'google-gemini'].includes(tool.slug)) {
        score += 14;
      }
    }
    if (/voice|music|song|monetize|audio/.test(titleLower)) {
      if (['elevenlabs', 'suno-ai', 'google-gemini'].includes(tool.slug)) {
        score += 18;
      }
    }
    if (/website|app|coding|apk|base44/.test(titleLower)) {
      if (['cursor', 'base44', 'deepseek', 'claude'].includes(tool.slug)) {
        score += 16;
      }
    }
    if (/ppt|presentation/.test(titleLower)) {
      if (['gamma-ai', 'canva-ai', 'chatgpt'].includes(tool.slug)) {
        score += 22;
      }
    }
    if (/padhai|study|english|time-table|paise|earn|prompt|content/.test(titleLower)) {
      if (['chatgpt', 'google-gemini', 'perplexity-ai', 'claude'].includes(tool.slug)) {
        score += 12;
      }
    }

    if (tool.featured) score += 2;

    return { tool, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount).map((item) => item.tool);
}
