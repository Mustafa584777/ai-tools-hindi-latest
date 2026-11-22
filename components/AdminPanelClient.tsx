'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Wrench,
  Plus,
  Search,
  Pencil,
  Trash2,
  Download,
  ExternalLink,
  X,
  Check,
  Menu,
  CloudUpload,
  Home,
  Compass,
  Loader2,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { AiTool, BlogPost, ToolPricing } from '@/lib/types';
import {
  fetchAdminTools,
  saveAdminTool,
  deleteAdminTool,
  syncToolsToFirestore,
  downloadToolsJsonFile,
} from '@/lib/toolsStorage';
import {
  saveBlogPostToFirestore,
  deleteBlogPostFromFirestore,
} from '@/lib/storage';
import ToolLogo from '@/components/ToolLogo';

type SidebarSection = 'articles' | 'tools';

const TOOL_CATEGORIES = [
  'AI Chatbots',
  'Image Generation',
  'Video Generation',
  'Coding & Dev',
  'Audio & Voice',
  'Design & UI',
  'Research & Search',
  'Productivity',
];

const TOOL_PRICINGS: ToolPricing[] = ['Free', 'Freemium', 'Paid', 'Open Source'];

function slugifyText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface NoticeState {
  type: 'success' | 'error';
  text: string;
}

interface PendingDelete {
  kind: 'article' | 'tool';
  id: string;
  slug: string;
  name: string;
}

export default function AdminPanelClient() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('articles');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tools, setTools] = useState<AiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingFirestore, setSyncingFirestore] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  // Article filters & modal state
  const [articleSearch, setArticleSearch] = useState('');
  const [articleStatusFilter, setArticleStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editingArticle, setEditingArticle] = useState<Partial<BlogPost> | null>(null);
  const [isNewArticle, setIsNewArticle] = useState(false);

  // Tool filters & modal state
  const [toolSearch, setToolSearch] = useState('');
  const [toolCategoryFilter, setToolCategoryFilter] = useState<string>('All');
  const [editingTool, setEditingTool] = useState<{
    id?: string;
    name: string;
    slug: string;
    tagline: string;
    category: string;
    pricing: ToolPricing;
    pricingDetails: string;
    description: string;
    featuresText: string;
    useCasesText: string;
    prosText: string;
    consText: string;
    websiteUrl: string;
    logoUrl: string;
    logoText: string;
    accentColor: string;
    featured: boolean;
    tagsText: string;
    rating: string;
    createdAt?: number;
  } | null>(null);
  const [isNewTool, setIsNewTool] = useState(false);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
  };

  useEffect(() => {
    let active = true;
    async function loadAll() {
      try {
        const [articlesRes, loadedTools] = await Promise.all([
          fetch('/api/articles?admin=1', { cache: 'no-store' }),
          fetchAdminTools(),
        ]);

        if (articlesRes.ok) {
          const data = await articlesRes.json();
          if (active && Array.isArray(data.posts)) {
            setPosts(data.posts);
          }
        }
        if (active) {
          setTools(loadedTools);
        }
      } catch (err) {
        if (active) {
          showNotice('error', (err as Error).message || 'Failed to load admin data');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAll();
    return () => {
      active = false;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const q = articleSearch.trim().toLowerCase();
    return posts.filter((p) => {
      if (articleStatusFilter !== 'all' && p.status !== articleStatusFilter) return false;
      if (!q) return true;
      return (
        (p.title || '').toLowerCase().includes(q) ||
        (p.slug || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
  }, [posts, articleSearch, articleStatusFilter]);

  const filteredTools = useMemo(() => {
    const q = toolSearch.trim().toLowerCase();
    return tools.filter((t) => {
      if (toolCategoryFilter !== 'All' && t.category !== toolCategoryFilter) return false;
      if (!q) return true;
      return (
        (t.name || '').toLowerCase().includes(q) ||
        (t.slug || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.tagline || '').toLowerCase().includes(q)
      );
    });
  }, [tools, toolSearch, toolCategoryFilter]);

  // Article Handlers
  const openNewArticleModal = () => {
    setIsNewArticle(true);
    setEditingArticle({
      title: '',
      slug: '',
      category: 'AI Guides',
      author: 'Anwar',
      date: new Date().toLocaleDateString('hi-IN'),
      readTime: '5 min read',
      image: '',
      imageAlt: '',
      excerpt: '',
      metaDescription: '',
      content: '<p>यहाँ अपना आर्टिकल लिखें...</p>',
      status: 'published',
      noIndex: false,
      recommendedTools: [],
    });
  };

  const openEditArticleModal = (post: BlogPost) => {
    setIsNewArticle(false);
    setEditingArticle({
      ...post,
      recommendedTools: post.recommendedTools || [],
    });
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle?.title?.trim()) {
      showNotice('error', 'Article title is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post: editingArticle }),
      });
      const data = await res.json();
      if (!res.ok || !data.post) {
        throw new Error(data.error || 'Failed to save article');
      }

      const savedPost = data.post as BlogPost;
      if (Array.isArray(data.posts)) {
        setPosts(data.posts);
      }

      // Best-effort Firestore sync
      try {
        await saveBlogPostToFirestore(savedPost);
      } catch {
        // Disk API succeeded; ignore external Firestore rule restrictions
      }

      setEditingArticle(null);
      showNotice('success', `Article "${savedPost.title}" saved successfully.`);
    } catch (err) {
      showNotice('error', (err as Error).message || 'Could not save article.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPostsJson = () => {
    const jsonStr = JSON.stringify(posts, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'posts.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Tool Handlers
  const openNewToolModal = () => {
    setIsNewTool(true);
    setEditingTool({
      name: '',
      slug: '',
      tagline: '',
      category: 'AI Chatbots',
      pricing: 'Freemium',
      pricingDetails: '',
      description: '',
      featuresText: '',
      useCasesText: '',
      prosText: '',
      consText: '',
      websiteUrl: 'https://',
      logoUrl: '',
      logoText: '',
      accentColor: '#ea580c',
      featured: false,
      tagsText: '',
      rating: '4.8',
    });
  };

  const openEditToolModal = (tool: AiTool) => {
    setIsNewTool(false);
    setEditingTool({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      tagline: tool.tagline || '',
      category: tool.category || 'AI Chatbots',
      pricing: tool.pricing || 'Freemium',
      pricingDetails: tool.pricingDetails || '',
      description: tool.description || '',
      featuresText: (tool.features || []).join('\n'),
      useCasesText: (tool.useCases || []).join('\n'),
      prosText: (tool.pros || []).join('\n'),
      consText: (tool.cons || []).join('\n'),
      websiteUrl: tool.websiteUrl || '',
      logoUrl: tool.logoUrl || '',
      logoText: tool.logoText || tool.name.slice(0, 2).toUpperCase(),
      accentColor: tool.accentColor || '#ea580c',
      featured: Boolean(tool.featured),
      tagsText: (tool.tags || []).join(', '),
      rating: tool.rating || '4.8',
      createdAt: tool.createdAt,
    });
  };

  const handleSaveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool?.name.trim() || !editingTool?.websiteUrl.trim()) {
      showNotice('error', 'Tool Name and Website URL are required.');
      return;
    }

    setSaving(true);
    try {
      const splitLines = (txt: string) =>
        txt
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);

      const saved = await saveAdminTool({
        id: editingTool.id,
        name: editingTool.name.trim(),
        slug: editingTool.slug.trim() || slugifyText(editingTool.name),
        tagline: editingTool.tagline.trim(),
        category: editingTool.category,
        pricing: editingTool.pricing,
        pricingDetails: editingTool.pricingDetails.trim(),
        description: editingTool.description.trim(),
        features: splitLines(editingTool.featuresText),
        useCases: splitLines(editingTool.useCasesText),
        pros: splitLines(editingTool.prosText),
        cons: splitLines(editingTool.consText),
        websiteUrl: editingTool.websiteUrl.trim(),
        logoUrl: editingTool.logoUrl.trim() || undefined,
        logoText: editingTool.logoText.trim() || editingTool.name.slice(0, 2).toUpperCase(),
        accentColor: editingTool.accentColor || '#ea580c',
        featured: editingTool.featured,
        tags: editingTool.tagsText
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        rating: editingTool.rating.trim() || '4.8',
        createdAt: editingTool.createdAt,
      });

      const refreshed = await fetchAdminTools();
      setTools(refreshed);
      setEditingTool(null);
      showNotice('success', `AI Tool "${saved.name}" saved at /tools/${saved.slug}/`);
    } catch (err) {
      showNotice('error', (err as Error).message || 'Could not save AI tool.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setSaving(true);
    try {
      if (pendingDelete.kind === 'article') {
        const res = await fetch(
          `/api/articles?id=${encodeURIComponent(pendingDelete.id)}&slug=${encodeURIComponent(pendingDelete.slug)}`,
          { method: 'DELETE' }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete article');
        if (Array.isArray(data.posts)) {
          setPosts(data.posts);
        }
        try {
          await deleteBlogPostFromFirestore(pendingDelete.id, pendingDelete.slug);
        } catch {}
        showNotice('success', `Deleted article "${pendingDelete.name}".`);
      } else {
        await deleteAdminTool(pendingDelete.id, pendingDelete.slug);
        setTools((prev) => prev.filter((t) => t.id !== pendingDelete.id && t.slug !== pendingDelete.slug));
        showNotice('success', `Deleted AI Tool "${pendingDelete.name}".`);
      }
      setPendingDelete(null);
    } catch (err) {
      showNotice('error', (err as Error).message || 'Delete failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToolsFirestore = async () => {
    setSyncingFirestore(true);
    try {
      const count = await syncToolsToFirestore(tools);
      showNotice('success', `Synced ${count} tools to Firestore.`);
    } catch (err) {
      showNotice(
        'error',
        `Firestore sync notice: ${((err as Error).message || '').slice(0, 120)}. Local tools.json remains active.`
      );
    } finally {
      setSyncingFirestore(false);
    }
  };

  const toggleRecommendedToolSlug = (slug: string) => {
    if (!editingArticle) return;
    const current = editingArticle.recommendedTools || [];
    const exists = current.includes(slug);
    setEditingArticle({
      ...editingArticle,
      recommendedTools: exists ? current.filter((s) => s !== slug) : [...current, slug],
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            aria-label="Toggle Admin Sidebar"
            className="p-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 cursor-pointer"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-extrabold text-base text-slate-950">AI Tool Hindi Admin</span>
        </div>

        <Link
          href="/tools"
          rel="nofollow"
          className="text-xs font-bold text-orange-600 hover:text-orange-700 whitespace-nowrap"
        >
          Tools Directory
        </Link>
      </header>

      {/* Left Sidebar Navigation */}
      <aside
        className={`${
          mobileSidebarOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'
        } lg:sticky lg:top-0 lg:flex lg:h-screen w-64 shrink-0 bg-white border-r border-slate-200 flex-col justify-between p-4`}
      >
        <div className="space-y-6">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div>
              <div className="font-extrabold text-lg text-slate-950 tracking-tight">
                AI Tool Hindi
              </div>
              <div className="text-xs font-semibold text-orange-600">Admin Workspace</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Sections */}
          <nav aria-label="Admin sections" className="space-y-1.5">
            <div className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Content Manager
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveSection('articles');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                activeSection === 'articles'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Articles</span>
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-lg tabular-nums ${
                  activeSection === 'articles'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {posts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection('tools');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                activeSection === 'tools'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Wrench className="w-4 h-4" />
                <span>AI Tools</span>
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-lg tabular-nums ${
                  activeSection === 'tools'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tools.length}
              </span>
            </button>
          </nav>

          {/* Quick Links */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="px-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Live Site
            </div>
            <Link
              href="/"
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Home className="w-4 h-4 text-orange-600" />
              <span>Homepage</span>
            </Link>
            <Link
              href="/tools"
              rel="nofollow"
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Compass className="w-4 h-4 text-orange-600" />
              <span>Tools Directory</span>
            </Link>
          </div>
        </div>

        <div className="px-3 py-3 bg-orange-50/70 border border-orange-100 rounded-2xl text-xs text-slate-700 space-y-1">
          <div className="font-extrabold text-orange-800">SEO Protection Active</div>
          <p className="leading-relaxed text-[11px]">
            All /tools pages are marked noindex, excluded from sitemap.xml, and blocked in robots.txt.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Notice Banner */}
        {notice && (
          <div
            role="status"
            className={`px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 text-sm font-semibold ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 flex items-center justify-center gap-3 text-slate-600 font-bold">
            <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
            <span>Loading Admin Workspace...</span>
          </div>
        ) : activeSection === 'articles' ? (
          /* ================= ARTICLES MANAGER ================= */
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                  Articles Manager
                </h1>
                <p className="text-sm text-slate-600 font-medium">
                  Blog articles add, edit, delete करें और हर article के recommended AI tools चुनें।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleExportPostsJson}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Export posts.json</span>
                </button>
                <button
                  type="button"
                  onClick={openNewArticleModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Article</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  placeholder="Search articles by title, slug, category..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(['all', 'published', 'draft'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setArticleStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer whitespace-nowrap ${
                      articleStatusFilter === status
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Articles Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Article</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="py-3.5 px-4 max-w-md">
                          <div className="font-bold text-slate-950 line-clamp-1">{post.title}</div>
                          <div className="text-xs text-slate-500 font-mono truncate">
                            /{post.slug}/
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {post.category}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold whitespace-nowrap">
                          <span
                            className={
                              post.status === 'published' ? 'text-emerald-700' : 'text-amber-700'
                            }
                          >
                            {post.status === 'published' ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/${post.slug}`}
                              target="_blank"
                              className="p-2 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                              title="Open Article"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEditArticleModal(post)}
                              className="p-2 rounded-lg text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                              title="Edit Article"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingDelete({
                                  kind: 'article',
                                  id: post.id,
                                  slug: post.slug,
                                  name: post.title,
                                })
                              }
                              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Article"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : (
          /* ================= AI TOOLS MANAGER ================= */
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                  AI Tools Directory Manager
                </h1>
                <p className="text-sm text-slate-600 font-medium">
                  यहाँ से /tools/[slug] pages add, edit और delete करें — blog articles में relevant tool boxes अपने-आप अपडेट होंगे।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSyncToolsFirestore}
                  disabled={syncingFirestore}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {syncingFirestore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4 text-orange-600" />
                  )}
                  <span>Sync Firestore</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadToolsJsonFile(tools)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Export tools.json</span>
                </button>
                <button
                  type="button"
                  onClick={openNewToolModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add AI Tool</span>
                </button>
              </div>
            </div>

            {/* Tool Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  placeholder="Search tools by name, slug, category..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {['All', ...TOOL_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setToolCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      toolCategoryFilter === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tools Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">AI Tool</th>
                      <th className="py-3.5 px-4">Route URL</th>
                      <th className="py-3.5 px-4">Category · Pricing</th>
                      <th className="py-3.5 px-4">Rating</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTools.map((tool) => (
                      <tr key={tool.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <ToolLogo tool={tool} size="sm" />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-950 flex items-center gap-2">
                                <span>{tool.name}</span>
                                {tool.featured && (
                                  <span className="text-[10px] font-extrabold uppercase text-orange-600">
                                    Popular
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">
                                {tool.tagline}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                          /tools/{tool.slug}/
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {tool.category} · <span className="text-orange-700">{tool.pricing}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-bold text-slate-800 tabular-nums whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {tool.rating || '4.8'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/tools/${tool.slug}`}
                              target="_blank"
                              rel="nofollow"
                              className="p-2 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                              title="View Tool Page"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEditToolModal(tool)}
                              className="p-2 rounded-lg text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                              title="Edit Tool"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingDelete({
                                  kind: 'tool',
                                  id: tool.id,
                                  slug: tool.slug,
                                  name: tool.name,
                                })
                              }
                              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Tool"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ================= ARTICLE CREATE / EDIT MODAL ================= */}
      {editingArticle && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-950">
                {isNewArticle ? 'Add New Article' : 'Edit Article'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingArticle(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={editingArticle.title || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingArticle((prev) => ({
                        ...prev,
                        title: val,
                        slug: isNewArticle ? slugifyText(val) : prev?.slug,
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={editingArticle.slug || ''}
                    onChange={(e) =>
                      setEditingArticle((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editingArticle.category || ''}
                    onChange={(e) =>
                      setEditingArticle((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingArticle.status || 'published'}
                    onChange={(e) =>
                      setEditingArticle((prev) => ({
                        ...prev,
                        status: e.target.value as 'published' | 'draft',
                      }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Featured Image URL
                  </label>
                  <input
                    type="text"
                    value={editingArticle.image || ''}
                    onChange={(e) =>
                      setEditingArticle((prev) => ({ ...prev, image: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Excerpt / Meta Description
                </label>
                <textarea
                  rows={2}
                  value={editingArticle.excerpt || ''}
                  onChange={(e) =>
                    setEditingArticle((prev) => ({
                      ...prev,
                      excerpt: e.target.value,
                      metaDescription: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  HTML Content *
                </label>
                <textarea
                  rows={7}
                  value={editingArticle.content || ''}
                  onChange={(e) =>
                    setEditingArticle((prev) => ({ ...prev, content: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              {/* Recommended Tools Override */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  Recommended AI Tools Box (Optional — auto-matches if empty)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {tools.map((t) => {
                    const selected = (editingArticle.recommendedTools || []).includes(t.slug);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleRecommendedToolSlug(t.slug)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          selected
                            ? 'bg-orange-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-orange-300'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Article</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= AI TOOL CREATE / EDIT MODAL ================= */}
      {editingTool && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-950">
                {isNewTool ? 'Add New AI Tool' : `Edit ${editingTool.name}`}
              </h2>
              <button
                type="button"
                onClick={() => setEditingTool(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTool} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tool Name *</label>
                  <input
                    type="text"
                    required
                    value={editingTool.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingTool((prev) =>
                        prev
                          ? {
                              ...prev,
                              name: val,
                              slug: isNewTool ? slugifyText(val) : prev.slug,
                              logoText: isNewTool ? val.slice(0, 2).toUpperCase() : prev.logoText,
                            }
                          : null
                      );
                    }}
                    placeholder="e.g., Grok"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL Slug (/tools/slug)
                  </label>
                  <input
                    type="text"
                    value={editingTool.slug}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, slug: slugifyText(e.target.value) } : null
                      )
                    }
                    placeholder="e.g., grok"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingTool.category}
                    onChange={(e) =>
                      setEditingTool((prev) => (prev ? { ...prev, category: e.target.value } : null))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white"
                  >
                    {TOOL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pricing</label>
                  <select
                    value={editingTool.pricing}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, pricing: e.target.value as ToolPricing } : null
                      )
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white"
                  >
                    {TOOL_PRICINGS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Website URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={editingTool.websiteUrl}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, websiteUrl: e.target.value } : null
                      )
                    }
                    placeholder="https://example.com"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Logo Image URL (Optional — auto-fetches official favicon if empty)
                  </label>
                  <input
                    type="text"
                    value={editingTool.logoUrl}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, logoUrl: e.target.value } : null
                      )
                    }
                    placeholder="/tool-logos/grok.png or https://..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Short Tagline (Hinglish)
                  </label>
                  <input
                    type="text"
                    value={editingTool.tagline}
                    onChange={(e) =>
                      setEditingTool((prev) => (prev ? { ...prev, tagline: e.target.value } : null))
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pricing Details
                  </label>
                  <input
                    type="text"
                    value={editingTool.pricingDetails}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, pricingDetails: e.target.value } : null
                      )
                    }
                    placeholder="Free tier · Pro $20/mo"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Logo Text</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={editingTool.logoText}
                      onChange={(e) =>
                        setEditingTool((prev) =>
                          prev ? { ...prev, logoText: e.target.value.toUpperCase() } : null
                        )
                      }
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Color</label>
                    <input
                      type="color"
                      value={editingTool.accentColor}
                      onChange={(e) =>
                        setEditingTool((prev) =>
                          prev ? { ...prev, accentColor: e.target.value } : null
                        )
                      }
                      className="w-full h-[42px] p-1 border border-slate-200 rounded-xl cursor-pointer bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Rating</label>
                    <input
                      type="text"
                      value={editingTool.rating}
                      onChange={(e) =>
                        setEditingTool((prev) =>
                          prev ? { ...prev, rating: e.target.value } : null
                        )
                      }
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Hinglish Description
                </label>
                <textarea
                  rows={3}
                  value={editingTool.description}
                  onChange={(e) =>
                    setEditingTool((prev) =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Key Features (1 per line)
                  </label>
                  <textarea
                    rows={3}
                    value={editingTool.featuresText}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, featuresText: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Best Use Cases (1 per line)
                  </label>
                  <textarea
                    rows={3}
                    value={editingTool.useCasesText}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, useCasesText: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pros (1 per line)
                  </label>
                  <textarea
                    rows={2}
                    value={editingTool.prosText}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, prosText: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cons (1 per line)
                  </label>
                  <textarea
                    rows={2}
                    value={editingTool.consText}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, consText: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tags (comma separated, for article matching)
                  </label>
                  <input
                    type="text"
                    value={editingTool.tagsText}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, tagsText: e.target.value } : null
                      )
                    }
                    placeholder="photo, prompt, video, chat"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <label className="inline-flex items-center gap-2.5 text-sm font-bold text-slate-800 pt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTool.featured}
                    onChange={(e) =>
                      setEditingTool((prev) =>
                        prev ? { ...prev, featured: e.target.checked } : null
                      )
                    }
                    className="w-4 h-4 accent-orange-600 rounded"
                  />
                  <span>Mark as Popular / Featured Tool</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTool(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save AI Tool</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-extrabold text-slate-950">Confirm Deletion</h3>
            </div>
            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              क्या आप वाकई <strong className="text-slate-950">{pendingDelete.name}</strong> को हमेशा के लिए डिलीट करना चाहते हैं?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
