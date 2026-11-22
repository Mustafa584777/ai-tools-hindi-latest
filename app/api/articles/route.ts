import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { BlogPost } from '@/lib/types';
import { getAllPostsServer, invalidatePostsCache } from '@/lib/serverPosts';
import { cleanPostForExport } from '@/lib/postClean';

export const revalidate = 604800; // 7 days

const POSTS_FILE_PATH = path.join(process.cwd(), 'data', 'posts.json');

export async function GET(req: NextRequest) {
  try {
    const isAdmin = req.nextUrl.searchParams.get('admin') === '1';
    const cleaned = getAllPostsServer();
    return NextResponse.json(
      { posts: cleaned },
      {
        headers: {
          'Cache-Control': isAdmin
            ? 'no-store, must-revalidate'
            : 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error: any) {
    console.error('Failed to read posts:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPost = body?.post as Partial<BlogPost> | undefined;
    if (!rawPost || !rawPost.title) {
      return NextResponse.json({ error: 'Article title is required.' }, { status: 400 });
    }

    const rawSlug = (rawPost.slug || rawPost.title)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const cleanSlug = rawSlug || `post-${Date.now()}`;
    const canonicalId = rawPost.id?.trim() || `blog-${cleanSlug}`;

    const postObj = cleanPostForExport({
      id: canonicalId,
      slug: cleanSlug,
      title: rawPost.title.trim(),
      excerpt: (rawPost.excerpt || '').trim(),
      metaDescription: (rawPost.metaDescription || '').trim(),
      content: rawPost.content || '<p></p>',
      category: (rawPost.category || 'AI Guides').trim(),
      author: (rawPost.author || 'Anwar').trim(),
      date: rawPost.date || new Date().toLocaleDateString('hi-IN'),
      readTime: rawPost.readTime || '5 min read',
      image: rawPost.image || '',
      imageAlt: rawPost.imageAlt || rawPost.title.trim(),
      status: rawPost.status || 'published',
      noIndex: Boolean(rawPost.noIndex),
      recommendedTools: Array.isArray(rawPost.recommendedTools)
        ? rawPost.recommendedTools.filter(Boolean)
        : undefined,
      createdAt: rawPost.createdAt || Date.now(),
    });

    const posts = getAllPostsServer();
    const idx = posts.findIndex(
      (p) => p.id === postObj.id || p.slug.toLowerCase() === postObj.slug.toLowerCase()
    );
    if (idx >= 0) {
      posts[idx] = postObj;
    } else {
      posts.unshift(postObj);
    }

    fs.writeFileSync(POSTS_FILE_PATH, JSON.stringify(posts, null, 2), 'utf-8');
    invalidatePostsCache();
    try {
      revalidatePath('/');
      revalidatePath(`/${postObj.slug}`);
    } catch {}

    return NextResponse.json({ post: postObj, posts });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save article' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id') || '';
    const slug = req.nextUrl.searchParams.get('slug') || '';
    if (!id && !slug) {
      return NextResponse.json({ error: 'Article id or slug is required.' }, { status: 400 });
    }

    const posts = getAllPostsServer();
    const filtered = posts.filter(
      (p) => p.id !== id && p.slug.toLowerCase() !== slug.toLowerCase()
    );

    fs.writeFileSync(POSTS_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
    invalidatePostsCache();
    try {
      revalidatePath('/');
      if (slug) revalidatePath(`/${slug}`);
    } catch {}

    return NextResponse.json({ posts: filtered });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete article' }, { status: 500 });
  }
}
