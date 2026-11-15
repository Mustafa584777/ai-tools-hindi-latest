import { BlogPost } from './types';
import { stripTableOfContents, sanitizeExternalLinks } from './utils';

export function extractFirstImageAndAlt(
  content: string,
  fallbackImage?: string,
  fallbackAlt?: string,
  fallbackTitle?: string
): { image: string; imageAlt: string; imageSlug: string } {
  const defaultImg =
    fallbackImage && !fallbackImage.startsWith('data:')
      ? fallbackImage
      : 'https://picsum.photos/seed/aitoolhindi/800/450';
  const defaultAlt = fallbackAlt || fallbackTitle || 'AI tutorial featured image';
  const defaultSlug = 'ai-tutorial';

  if (!content) {
    return {
      image: defaultImg,
      imageAlt: defaultAlt,
      imageSlug: defaultSlug,
    };
  }

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  let firstValidImage: { image: string; imageAlt: string; imageSlug: string } | null = null;
  let firstAnyImage: { image: string; imageAlt: string; imageSlug: string } | null = null;

  while ((match = imgRegex.exec(content)) !== null) {
    const rawSrc = match[1];
    const imgTag = match[0];
    const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
    const slugMatch = imgTag.match(/data-img-slug=["']([^"']*)["']/i);

    let cleanSrc = rawSrc.trim().replace(/[\\\"\']+$/, '');
    if (
      cleanSrc.startsWith('data:') &&
      !cleanSrc.includes('wp-content') &&
      !cleanSrc.includes('cloudinary.com')
    ) {
      cleanSrc = 'https://picsum.photos/seed/aitoolhindi/800/450';
    }

    const cleanAlt =
      altMatch && altMatch[1] && altMatch[1].trim()
        ? altMatch[1].trim()
        : fallbackAlt || fallbackTitle || 'AI tutorial featured image';

    let rawSlug = '';
    if (slugMatch && slugMatch[1]) {
      rawSlug = slugMatch[1];
    } else {
      try {
        const urlParts = cleanSrc.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];
        const nameWithoutExt =
          filename.substring(0, filename.lastIndexOf('.')) || filename;
        rawSlug = nameWithoutExt;
      } catch {
        rawSlug = cleanAlt;
      }
    }

    let cleanSlug = rawSlug
      .replace(/-featured$/i, '')
      .replace(/%[0-9a-fA-F]{2}/g, '-')
      .toLowerCase()
      .replace(/[^a-z0-9\-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!cleanSlug) {
      cleanSlug = 'ai-tutorial';
    }

    const item = { image: cleanSrc, imageAlt: cleanAlt, imageSlug: cleanSlug };

    if (!firstAnyImage && cleanSrc) {
      firstAnyImage = item;
    }

    if (
      !firstValidImage &&
      cleanSrc &&
      !cleanSrc.includes('img.youtube.com') &&
      !cleanSrc.includes('i.ytimg.com')
    ) {
      firstValidImage = item;
      break;
    }
  }

  const selected = firstValidImage || firstAnyImage;
  if (selected) {
    return selected;
  }

  return {
    image: defaultImg,
    imageAlt: defaultAlt,
    imageSlug: defaultSlug,
  };
}

export function cleanPostForExport(post: BlogPost): BlogPost {
  let img = post.image || '';
  if (
    img.startsWith('data:') &&
    !img.includes('wp-content') &&
    !img.includes('cloudinary.com')
  ) {
    img = 'https://picsum.photos/seed/aitoolhindi/800/450';
  }

  let content = stripTableOfContents(post.content || '');
  content = sanitizeExternalLinks(content);
  content = content.replace(
    /<img([^>]+)src=["'](data:[^"']+)["']([^>]*)>/gi,
    (match, p1, srcVal, p3) => {
      if (!srcVal.includes('wp-content') && !srcVal.includes('cloudinary.com')) {
        return `<img${p1}src="https://picsum.photos/seed/aitoolhindi/800/450"${p3}>`;
      }
      return match;
    }
  );

  const { image, imageAlt, imageSlug } = extractFirstImageAndAlt(
    content,
    img,
    post.imageAlt,
    post.title
  );

  return {
    ...post,
    image,
    imageAlt,
    imageSlug,
    content,
  };
}

/**
 * Strips heavy HTML `content` and `faqs` from list/card items so Server Components
 * only serialize lightweight metadata (~25KB total instead of 320KB+ per route).
 */
export function toPostSummary(post: BlogPost): BlogPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    metaDescription: post.metaDescription,
    content: '',
    category: post.category,
    author: post.author,
    date: post.date,
    readTime: post.readTime,
    image: post.image,
    imageAlt: post.imageAlt,
    imageSlug: post.imageSlug,
    status: post.status,
    noIndex: post.noIndex,
    createdAt: post.createdAt,
  };
}
