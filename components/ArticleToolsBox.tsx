'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AiTool } from '@/lib/types';

interface ArticleToolsBoxProps {
  tools: AiTool[];
}

export default function ArticleToolsBox({ tools }: ArticleToolsBoxProps) {
  if (!tools || tools.length === 0) return null;

  return (
    <aside
      aria-label="Recommended AI Tools"
      className="not-prose my-8 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 border border-orange-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-600 text-white shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-950 text-base sm:text-lg leading-tight">
              इस गाइड के Best AI Tools
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              नीचे दिए गए relevant AI tools को तुरंत ट्राई करें
            </p>
          </div>
        </div>

        <Link
          href="/tools"
          rel="nofollow"
          className="text-xs font-extrabold text-orange-600 hover:text-orange-700 whitespace-nowrap"
        >
          All AI Tools &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="bg-white border border-slate-200 hover:border-orange-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
          >
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0"
                style={{ backgroundColor: tool.accentColor || '#ea580c' }}
                aria-hidden="true"
              >
                {tool.logoText || tool.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-extrabold text-slate-950 text-sm sm:text-base">
                    {tool.name}
                  </span>
                  <span className="text-xs text-slate-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {tool.category}
                  </span>
                  <span className="text-xs text-slate-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs font-bold text-orange-700">
                    {tool.pricing}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium line-clamp-1">
                  {tool.tagline}
                </p>
              </div>
            </div>

            <Link
              href={`/tools/${tool.slug}`}
              rel="nofollow"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs whitespace-nowrap shrink-0 transition-all"
            >
              <span>Check this tool</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </aside>
  );
}
