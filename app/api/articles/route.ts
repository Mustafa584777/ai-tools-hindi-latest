import { NextResponse } from 'next/server';
import { getAllPostsServer } from '@/lib/serverPosts';

export const revalidate = 604800; // 7 days

export async function GET() {
  try {
    const cleaned = getAllPostsServer();
    return NextResponse.json(
      { posts: cleaned },
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
