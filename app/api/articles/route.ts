import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BlogPost } from '@/lib/types';
import { cleanPostForExport } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dataFilePath = path.join(process.cwd(), 'data', 'posts.json');
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((p) => cleanPostForExport(p as BlogPost));
        return NextResponse.json({ posts: cleaned });
      }
    }
    return NextResponse.json({ posts: [] });
  } catch (error: any) {
    console.error('Failed to read posts:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load posts' }, { status: 500 });
  }
}
