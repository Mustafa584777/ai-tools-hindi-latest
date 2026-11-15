import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BlogPost } from '@/lib/types';
import { cleanPostForExport } from '@/lib/storage';

export const revalidate = 604800; // 7 days

export async function GET() {
  try {
    const dataFilePath = path.join(process.cwd(), 'data', 'posts.json');
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((p) => cleanPostForExport(p as BlogPost));
        return NextResponse.json(
          { posts: cleaned },
          {
            headers: {
              'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=604800',
            },
          }
        );
      }
    }
    return NextResponse.json(
      { posts: [] },
      {
        headers: {
          'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error: any) {
    console.error('Failed to read posts:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load posts' }, { status: 500 });
  }
}
