'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AiTool } from '@/lib/types';
import ToolLogo from '@/components/ToolLogo';

interface ArticleToolsBoxProps {
  tool: AiTool;
}

export default function ArticleToolsBox({ tool }: ArticleToolsBoxProps) {
  if (!tool) return null;

  return (
    <aside
      aria-label={`${tool.name} AI Tool`}
      className="not-prose article-tool-card my-7 bg-gradient-to-r from-orange-50/75 via-white to-amber-50/45 border border-orange-200 hover:border-orange-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <ToolLogo tool={tool} size="md" />

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/tools/${tool.slug}`}
              rel="nofollow"
              className="tool-title-link font-extrabold text-slate-950 text-base sm:text-lg leading-tight"
            >
              {tool.name}
            </Link>
            <span className="text-xs text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="text-xs font-semibold text-slate-600">{tool.category}</span>
            <span className="text-xs text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="text-xs font-bold text-orange-700">{tool.pricing}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-snug line-clamp-2 !mb-0">
            {tool.tagline || tool.description}
          </p>
        </div>
      </div>

      <Link
        href={`/tools/${tool.slug}`}
        rel="nofollow"
        className="tool-cta-btn inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 !text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm shadow-orange-500/20 whitespace-nowrap shrink-0 transition-all no-underline"
      >
        <span>Check this tool</span>
        <ArrowRight className="w-4 h-4 text-white" />
      </Link>
    </aside>
  );
}
