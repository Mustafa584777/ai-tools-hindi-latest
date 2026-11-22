'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ListOrdered } from 'lucide-react';
import { TocItem } from '@/lib/utils';

export default function TableOfContents({ items }: { items: TocItem[] }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!items || items.length < 2) return null;

  const scrollToHeading = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState(null, '', `#${id}`);
      }
    }
  };

  return (
    <div className="my-6 sm:my-8 bg-orange-50/70 border border-orange-200/90 rounded-2xl p-4 sm:p-6 shadow-xs transition-all">
      <div className="flex items-center justify-between pb-3 border-b border-orange-200/70">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-orange-600 text-white shadow-xs">
            <ListOrdered className="w-4 h-4" />
          </div>
          <span className="font-normal text-black text-[13px] sm:text-[14.5px] tracking-tight">
            Table of Contents
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 text-[10px] font-normal text-orange-700 hover:text-orange-900 bg-orange-100/90 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Hide Table of Contents" : "Show Table of Contents"}
        >
          <span>{isOpen ? 'Hide' : 'Show'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <nav className="mt-4" aria-label="Table of Contents">
          <ul className="space-y-1.5 list-none p-0 m-0">
            {items.map((item) => {
              const isH3 = item.level === 3;
              return (
                <li
                  key={item.id}
                  className={`${isH3 ? 'ml-4 sm:ml-6 text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-[13px]'} font-normal`}
                >
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => scrollToHeading(item.id, e)}
                    className="text-slate-800 hover:text-orange-600 transition-colors py-0.5 no-underline hover:no-underline font-normal"
                  >
                    {item.text}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
