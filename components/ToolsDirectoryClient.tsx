'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Sparkles, ArrowUpRight, ArrowRight, Compass, Star, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TopicChatbot from '@/components/TopicChatbot';
import ToolLogo from '@/components/ToolLogo';
import { AiTool, ToolPricing } from '@/lib/types';

interface ToolsDirectoryClientProps {
  initialTools: AiTool[];
  blogCategories?: string[];
}

const PRICING_FILTERS: Array<'All' | ToolPricing> = ['All', 'Free', 'Freemium', 'Paid', 'Open Source'];

export default function ToolsDirectoryClient({
  initialTools,
  blogCategories,
}: ToolsDirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPricing, setSelectedPricing] = useState<'All' | ToolPricing>('All');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(initialTools.map((t) => t.category).filter(Boolean)));
    return ['All', ...cats];
  }, [initialTools]);

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialTools.filter((tool) => {
      if (selectedCategory !== 'All' && tool.category !== selectedCategory) return false;
      if (selectedPricing !== 'All' && tool.pricing !== selectedPricing) return false;
      if (!q) return true;
      const haystack = [
        tool.name,
        tool.tagline,
        tool.description,
        tool.category,
        tool.pricing,
        ...(tool.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [initialTools, searchQuery, selectedCategory, selectedPricing]);

  const featuredCount = useMemo(
    () => initialTools.filter((t) => t.featured).length,
    [initialTools]
  );

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedPricing('All');
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCategory !== 'All' || selectedPricing !== 'All';

  return (
    <>
      <Navbar categories={blogCategories} />

      <main className="flex-1 w-full">
        {/* Directory Hero */}
        <section className="bg-gradient-to-b from-orange-50/80 via-amber-50/30 to-slate-50 border-b border-orange-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-orange-700">
                <Compass className="w-4 h-4 text-orange-600" />
                <span>AI Tools Directory · आसान Hinglish गाइड</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-slate-950 leading-tight">
                Best AI Tools Directory for Creators, Students &amp; Builders
              </h1>
              <p className="text-sm sm:text-base text-slate-700 font-normal leading-relaxed">
                Chatbots, Photo Generators, Video AI, Coding Assistants और Productivity Tools को एक जगह खोजें — आसान Hinglish रिव्यू, Pricing और सही इस्तेमाल के तरीकों के साथ।
              </p>
            </div>

            {/* Search & Directory Metrics */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              <div className="relative flex-1 max-w-2xl">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search AI tools (e.g., Grok, Gemini, Midjourney, Video, Coding)..."
                  aria-label="Search AI tools"
                  className="w-full pl-12 pr-10 py-3.5 bg-white border border-orange-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-6 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-600 shrink-0">
                <div>
                  <div className="text-lg font-extrabold text-slate-950 tabular-nums leading-none">
                    {initialTools.length}
                  </div>
                  <div className="mt-1">Verified Tools</div>
                </div>
                <div className="h-7 w-px bg-slate-200" />
                <div>
                  <div className="text-lg font-extrabold text-orange-600 tabular-nums leading-none">
                    {featuredCount}
                  </div>
                  <div className="mt-1">Top Picks</div>
                </div>
                <div className="h-7 w-px bg-slate-200" />
                <div>
                  <div className="text-lg font-extrabold text-slate-950 tabular-nums leading-none">
                    {categories.length - 1}
                  </div>
                  <div className="mt-1">Categories</div>
                </div>
              </div>
            </div>

            {/* Interactive Segmented Filters */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                        active
                          ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:text-orange-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-xs font-bold text-slate-500 mr-1 whitespace-nowrap">
                    Pricing:
                  </span>
                  {PRICING_FILTERS.map((pricing) => {
                    const active = selectedPricing === pricing;
                    return (
                      <button
                        key={pricing}
                        type="button"
                        onClick={() => setSelectedPricing(pricing)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        {pricing}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                  <span className="tabular-nums">
                    Showing {filteredTools.length} of {initialTools.length} tools
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-orange-600 hover:text-orange-700 font-bold underline underline-offset-2 cursor-pointer"
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Directory Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {filteredTools.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
              <Sparkles className="w-8 h-8 text-orange-600 mx-auto" />
              <h2 className="text-xl font-medium text-slate-900">
                कोई matching AI tool नहीं मिला
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                अपना search keyword बदलें या category / pricing filter को &ldquo;All&rdquo; पर रीसेट करें।
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Show All Tools
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTools.map((tool) => (
                <article
                  key={tool.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3.5">
                    {/* Card Header */}
                    <div className="flex items-start gap-3.5">
                      <ToolLogo tool={tool} size="md" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={`/tools/${tool.slug}`}
                            rel="nofollow"
                            className="font-extrabold text-lg text-slate-950 hover:text-orange-600 transition-colors truncate"
                          >
                            {tool.name}
                          </Link>
                          {tool.featured && (
                            <span className="text-[11px] font-extrabold text-orange-600 uppercase tracking-wider shrink-0">
                              Popular
                            </span>
                          )}
                        </div>

                        {/* Unboxed metadata row with middot separator */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500 mt-0.5">
                          <span className="text-slate-700">{tool.category}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              tool.pricing === 'Free' || tool.pricing === 'Open Source'
                                ? 'text-emerald-700 font-bold'
                                : tool.pricing === 'Freemium'
                                  ? 'text-orange-700 font-bold'
                                  : 'text-slate-700 font-bold'
                            }
                          >
                            {tool.pricing}
                          </span>
                          {tool.rating && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-0.5 text-slate-800 tabular-nums">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {tool.rating}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-700 font-normal leading-relaxed line-clamp-2">
                      {tool.tagline || tool.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                    <Link
                      href={`/tools/${tool.slug}`}
                      rel="nofollow"
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-600 hover:text-orange-700 transition-colors whitespace-nowrap"
                    >
                      <span>Check this tool</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <a
                      href={tool.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-orange-50 text-slate-800 hover:text-orange-700 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Visit</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <TopicChatbot
        topicTitle="AI Tools Directory (Aitoolhindi.online)"
        topicContent={initialTools
          .slice(0, 12)
          .map((t) => `${t.name} (${t.category}, ${t.pricing}): ${t.tagline}`)
          .join('\n')}
      />
      <Footer />
    </>
  );
}
