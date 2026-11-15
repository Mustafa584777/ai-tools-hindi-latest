import { getPublishedPostsServer } from '@/lib/serverPosts';
import { toPostSummary } from '@/lib/postClean';
import HomeViewClient from '@/components/HomeViewClient';

export const revalidate = 604800; // 7 days ISR cache

export default async function HomePage() {
  const publishedPosts = getPublishedPostsServer();
  const categories = Array.from(
    new Set(publishedPosts.map((p) => p.category).filter(Boolean))
  ) as string[];
  const summaryPosts = publishedPosts.map(toPostSummary);

  return (
    <HomeViewClient initialPosts={summaryPosts} categories={categories} />
  );
}
