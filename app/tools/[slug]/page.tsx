import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Star,
  Layers,
  BookOpen,
  Compass,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TopicChatbot from '@/components/TopicChatbot';
import ToolLogo from '@/components/ToolLogo';
import { getAllToolsServer, getToolBySlugServer } from '@/lib/serverTools';
import { getPublishedPostsServer } from '@/lib/serverPosts';

export const revalidate = 604800; // 7 days ISR cache
export const dynamicParams = true;

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const tools = getAllToolsServer();
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlugServer(slug);

  if (!tool) {
    return {
      title: 'AI Tool Not Found | Aitoolhindi.online',
      robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
        },
      },
    };
  }

  return {
    title: `${tool.name} – ${tool.category} AI Tool Review & Guide | Aitoolhindi.online`,
    description: tool.tagline || tool.description,
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
}

export default async function ToolDetailPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlugServer(slug);

  if (!tool) {
    notFound();
  }

  const allTools = getAllToolsServer();
  const publishedPosts = getPublishedPostsServer();
  const blogCategories = Array.from(
    new Set(publishedPosts.map((p) => p.category).filter(Boolean))
  ) as string[];

  // Related tutorials on the blog mentioning this tool or matching tags
  const toolKeywords = [
    tool.name.toLowerCase(),
    tool.slug.toLowerCase().replace(/-/g, ' '),
    ...(tool.tags || []).map((t) => t.toLowerCase()),
  ];

  const relatedArticles = publishedPosts
    .filter((post) => {
      const text = `${post.title} ${post.slug} ${post.category}`.toLowerCase();
      return toolKeywords.some((kw) => kw.length > 2 && text.includes(kw));
    })
    .slice(0, 4);

  const similarTools = allTools
    .filter((t) => t.id !== tool.id)
    .sort((a, b) => {
      const aMatch = a.category === tool.category ? 1 : 0;
      const bMatch = b.category === tool.category ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, 4);

  const topicSummaryForChat = `${tool.name} (${tool.category}, ${tool.pricing}): ${tool.description}\nFeatures: ${(tool.features || []).join(', ')}\nUse Cases: ${(tool.useCases || []).join(', ')}`;

  return (
    <>
      <Navbar categories={blogCategories} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/tools"
            rel="nofollow"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to AI Tools Directory</span>
          </Link>

          <span className="text-xs font-semibold text-slate-500">
            /tools/{tool.slug}/
          </span>
        </div>

        {/* Hero Summary Card */}
        <section className="bg-white rounded-3xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600" />
          <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <ToolLogo tool={tool} size="lg" />

              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="text-orange-700 font-bold">{tool.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-900 font-bold">{tool.pricing}</span>
                  {tool.rating && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-slate-900 font-bold tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {tool.rating}/5
                      </span>
                    </>
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl font-medium text-slate-950 tracking-tight">
                  {tool.name}
                </h1>

                <p className="text-sm sm:text-base text-slate-700 font-normal leading-relaxed max-w-2xl">
                  {tool.tagline}
                </p>

                {tool.pricingDetails && (
                  <p className="text-xs font-semibold text-slate-500 pt-0.5">
                    Pricing: {tool.pricingDetails}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <a
                href={tool.websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-sm rounded-2xl shadow-sm shadow-orange-500/25 transition-all whitespace-nowrap"
              >
                <span>Visit Official Website</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>

              <Link
                href="/tools"
                rel="nofollow"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl transition-colors whitespace-nowrap"
              >
                <Compass className="w-4 h-4 text-orange-600" />
                <span>Browse All AI Tools</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 8 cols */}
          <div className="lg:col-span-8 space-y-6">
            {/* Overview */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-medium text-slate-950 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600" />
                <span>{tool.name} क्या है और कैसे काम करता है?</span>
              </h2>
              <p className="text-base text-slate-800 font-normal leading-relaxed">
                {tool.description}
              </p>
            </section>

            {/* Key Features */}
            {tool.features && tool.features.length > 0 && (
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
                <h2 className="text-xl font-medium text-slate-950 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange-600" />
                  <span>प्रमुख फीचर्स (Key Features)</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {tool.features.map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm font-medium text-slate-800 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0 mt-1" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Use Cases */}
            {tool.useCases && tool.useCases.length > 0 && (
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
                <h2 className="text-xl font-medium text-slate-950">
                  Best Use Cases (आप कहाँ इस्तेमाल कर सकते हैं?)
                </h2>
                <ul className="space-y-3">
                  {tool.useCases.map((uc, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm sm:text-base font-medium text-slate-800"
                    >
                      <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-700 font-extrabold text-xs flex items-center justify-center shrink-0 tabular-nums mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{uc}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Pros & Cons */}
            {((tool.pros && tool.pros.length > 0) || (tool.cons && tool.cons.length > 0)) && (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {tool.pros && tool.pros.length > 0 && (
                  <div className="bg-white rounded-3xl border border-emerald-200 p-6 space-y-3">
                    <h3 className="text-base font-extrabold text-emerald-800">
                      फायदे (Pros)
                    </h3>
                    <ul className="space-y-2.5">
                      {tool.pros.map((pro, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm font-medium text-slate-800"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tool.cons && tool.cons.length > 0 && (
                  <div className="bg-white rounded-3xl border border-amber-200 p-6 space-y-3">
                    <h3 className="text-base font-extrabold text-amber-900">
                      कमियाँ / सीमाएं (Cons)
                    </h3>
                    <ul className="space-y-2.5">
                      {tool.cons.map((con, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm font-medium text-slate-800"
                        >
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Related Tutorials from Blog */}
            {relatedArticles.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                <h3 className="font-extrabold text-base text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <BookOpen className="w-4 h-4 text-orange-600" />
                  <span>Related Hindi Tutorials</span>
                </h3>
                <div className="space-y-3">
                  {relatedArticles.map((art) => (
                    <Link
                      key={art.id}
                      href={`/${art.slug}`}
                      className="block p-3 rounded-2xl bg-slate-50 hover:bg-orange-50/70 border border-slate-100 hover:border-orange-200 transition-colors space-y-1"
                    >
                      <div className="text-[11px] font-bold text-orange-600">
                        {art.category}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-2">
                        {art.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Similar AI Tools */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-extrabold text-base text-slate-950 border-b border-slate-100 pb-3">
                Similar AI Tools
              </h3>
              <div className="space-y-3">
                {similarTools.map((other) => (
                  <Link
                    key={other.id}
                    href={`/tools/${other.slug}`}
                    rel="nofollow"
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 hover:bg-orange-50/60 border border-slate-100 hover:border-orange-200 transition-colors"
                  >
                    <ToolLogo tool={other} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 truncate">
                        {other.name}
                      </div>
                      <div className="text-xs text-slate-500 font-medium truncate">
                        {other.category} · {other.pricing}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <TopicChatbot topicTitle={`${tool.name} AI Tool`} topicContent={topicSummaryForChat} />
      <Footer />
    </>
  );
}
