import type { Metadata } from 'next';
import { getAllToolsServer } from '@/lib/serverTools';
import { getPublishedPostsServer } from '@/lib/serverPosts';
import ToolsDirectoryClient from '@/components/ToolsDirectoryClient';

export const revalidate = 604800; // 7 days ISR cache

export const metadata: Metadata = {
  title: 'AI Tools Directory – Top AI Tools in Hindi | Aitoolhindi.online',
  description:
    'Discover popular AI tools like Grok, Google Gemini, ChatGPT, Midjourney, Runway, ElevenLabs and Cursor with simple Hinglish guides and pricing.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function ToolsDirectoryPage() {
  const tools = getAllToolsServer();
  const publishedPosts = getPublishedPostsServer();
  const blogCategories = Array.from(
    new Set(publishedPosts.map((p) => p.category).filter(Boolean))
  ) as string[];

  return <ToolsDirectoryClient initialTools={tools} blogCategories={blogCategories} />;
}
