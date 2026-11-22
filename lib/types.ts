export interface BlogPost {
  id: string;
  slug: string; // Exact WordPress URL slug, e.g. "top-ai-tools-in-hindi"
  title: string;
  excerpt: string;
  metaDescription?: string;
  content: string; // HTML or markdown formatted content
  category: string;
  author: string;
  date: string;
  readTime?: string;
  image: string;
  imageAlt?: string;
  imageSlug?: string;
  status: 'published' | 'draft';
  noIndex?: boolean;
  faqs?: { question: string; answer: string; }[];
  recommendedTools?: string[]; // Optional list of tool slugs to highlight inside the article
  createdAt?: number;
}

export type ToolPricing = 'Free' | 'Freemium' | 'Paid' | 'Open Source';

export interface AiTool {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  pricing: ToolPricing;
  pricingDetails?: string;
  description: string;
  features?: string[];
  useCases?: string[];
  pros?: string[];
  cons?: string[];
  websiteUrl: string;
  logoUrl?: string;
  logoText?: string;
  accentColor?: string;
  featured?: boolean;
  tags?: string[];
  rating?: string;
  createdAt?: number;
  updatedAt?: number;
}
