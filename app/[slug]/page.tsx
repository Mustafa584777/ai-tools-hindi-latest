import fs from 'fs';
import path from 'path';
import { BlogPost } from '@/lib/types';
import { cleanPostForExport } from '@/lib/storage';
import ArticleViewClient from '@/components/ArticleViewClient';

export const dynamic = 'force-dynamic';

async function getPostsServer(): Promise<BlogPost[]> {
  try {
    const dataFilePath = path.join(process.cwd(), 'data', 'posts.json');
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map(p => cleanPostForExport(p as BlogPost));
      }
    }
  } catch {}
  return [];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: PageProps) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams.slug || '';
  const cleanSlug = rawSlug.replace(/\/+$/, '').trim().toLowerCase();

  const posts = await getPostsServer();

  const foundPost = posts.find(p => {
    const pSlug = (p.slug || '').replace(/\/+$/, '').trim().toLowerCase();
    const pId = (p.id || '').replace(/^blog-/, '').trim().toLowerCase();
    return pSlug === cleanSlug || pId === cleanSlug || p.id === cleanSlug || p.id === `blog-${cleanSlug}`;
  });

  const foundCat = posts.find(p =>
    p.category && p.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === cleanSlug
  )?.category;

  const publishedPosts = posts.filter(p => p.status !== 'draft');

  return (
    <ArticleViewClient
      initialPost={foundPost || null}
      initialMatchedCategory={foundCat || null}
      initialPosts={publishedPosts}
      cleanSlug={cleanSlug}
    />
  );
}
