import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import { AiTool } from '@/lib/types';
import { getAllToolsServer } from '@/lib/serverTools';

const TOOLS_FILE_PATH = path.join(process.cwd(), 'data', 'tools.json');

function writeToolsFile(tools: AiTool[]) {
  fs.writeFileSync(TOOLS_FILE_PATH, JSON.stringify(tools, null, 2), 'utf-8');
}

export async function GET(req: NextRequest) {
  try {
    const isAdmin = req.nextUrl.searchParams.get('admin') === '1';
    const tools = getAllToolsServer();
    return NextResponse.json(
      { tools },
      {
        headers: {
          'Cache-Control': isAdmin
            ? 'no-store, must-revalidate'
            : 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load tools' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const incomingTool = body?.tool as Partial<AiTool> | undefined;
    if (!incomingTool || !incomingTool.name || !incomingTool.websiteUrl) {
      return NextResponse.json(
        { error: 'Tool name and website URL are required.' },
        { status: 400 }
      );
    }

    const rawSlug = (incomingTool.slug || incomingTool.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const cleanSlug = rawSlug || `tool-${Date.now()}`;
    const canonicalId = incomingTool.id?.trim() || `tool-${cleanSlug}`;

    const cleanTool: AiTool = {
      id: canonicalId,
      slug: cleanSlug,
      name: incomingTool.name.trim(),
      tagline: (incomingTool.tagline || incomingTool.description || '').trim().slice(0, 240),
      category: (incomingTool.category || 'AI Chatbots').trim(),
      pricing: incomingTool.pricing || 'Freemium',
      pricingDetails: (incomingTool.pricingDetails || '').trim(),
      description: (incomingTool.description || incomingTool.tagline || '').trim(),
      features: Array.isArray(incomingTool.features) ? incomingTool.features.filter(Boolean) : [],
      useCases: Array.isArray(incomingTool.useCases) ? incomingTool.useCases.filter(Boolean) : [],
      pros: Array.isArray(incomingTool.pros) ? incomingTool.pros.filter(Boolean) : [],
      cons: Array.isArray(incomingTool.cons) ? incomingTool.cons.filter(Boolean) : [],
      websiteUrl: incomingTool.websiteUrl.trim(),
      logoText: (incomingTool.logoText || incomingTool.name.slice(0, 2).toUpperCase()).slice(0, 4),
      accentColor: incomingTool.accentColor || '#ea580c',
      featured: Boolean(incomingTool.featured),
      tags: Array.isArray(incomingTool.tags) ? incomingTool.tags.filter(Boolean) : [],
      rating: incomingTool.rating || '4.8',
      createdAt: incomingTool.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const existingTools = getAllToolsServer();
    const idx = existingTools.findIndex(
      (t) => t.id === cleanTool.id || t.slug.toLowerCase() === cleanTool.slug.toLowerCase()
    );

    if (idx >= 0) {
      existingTools[idx] = cleanTool;
    } else {
      existingTools.unshift(cleanTool);
    }

    writeToolsFile(existingTools);
    try {
      revalidatePath('/tools');
      revalidatePath(`/tools/${cleanTool.slug}`);
      revalidatePath('/');
    } catch {}

    return NextResponse.json({ tool: cleanTool, tools: existingTools });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save tool' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id') || '';
    const slug = req.nextUrl.searchParams.get('slug') || '';
    if (!id && !slug) {
      return NextResponse.json({ error: 'Tool id or slug is required.' }, { status: 400 });
    }

    const existingTools = getAllToolsServer();
    const filtered = existingTools.filter(
      (t) => t.id !== id && t.slug.toLowerCase() !== slug.toLowerCase()
    );

    writeToolsFile(filtered);
    try {
      revalidatePath('/tools');
      if (slug) revalidatePath(`/tools/${slug}`);
      revalidatePath('/');
    } catch {}

    return NextResponse.json({ tools: filtered });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete tool' },
      { status: 500 }
    );
  }
}
