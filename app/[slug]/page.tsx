import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPost } from '@/lib/types';
import { cleanPostForExport } from '@/lib/storage';
import ArticleViewClient from '@/components/ArticleViewClient';

export const dynamic = 'force-dynamic';

async function getPostsServer(): Promise<BlogPost[]> {
  try {
    const dataFilePath = path.join(process.cwd(), 'data', 'posts.json');
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => cleanPostForExport(p as BlogPost));
      }
    }
  } catch {}
  return [];
}

const STATIC_PAGES: Record<string, { title: string; excerpt: string; content: string }> = {
  'about-us': {
    title: 'About Us – Aitoolhindi.online',
    excerpt: 'Aitoolhindi.online भारत का विश्वसनीय हिंदी आर्टिफिशियल इंटेलिजेंस (AI) ट्यूटोरियल और टूल्स गाइड मंच है।',
    content: `<h2>हमारे बारे में (About Aitoolhindi.online)</h2>
<p><strong>Aitoolhindi.online</strong> भारत का तेजी से बढ़ता हुआ हिंदी AI ज्ञान पोर्टल है। हमारा लक्ष्य भारत के प्रत्येक व्यक्ति, छात्र, कंटेंट क्रिएटर, डिजिटल मार्केटर और व्यवसायियों तक आर्टिफिशियल इंटेलिजेंस (Artificial Intelligence) और आधुनिक तकनीक को सबसे सरल हिंदी भाषा में पहुंचाना है।</p>
<h3>हमारा उद्देश्य (Our Mission)</h3>
<p>AI तकनीक बहुत तेजी से आगे बढ़ रही है। लेकिन अधिकांश सामग्री केवल अंग्रेजी में उपलब्ध है। हम ChatGPT, Google Gemini, Midjourney, Grok, AI Video Generators, और Prompt Engineering जैसी सभी प्रमुख तकनीकों पर आसान, स्टेप-बाय-स्टेप ट्यूटोरियल और उपयोगी गाइड्स हिंदी में उपलब्ध कराते हैं ताकि कोई भी पीछे न रहे।</p>
<h3>हमारी मुख्य विशेषताएं</h3>
<ul>
<li><strong>100% नि:शुल्क हिंदी ट्यूटोरियल्स:</strong> हर ट्यूटोरियल आसान हिंदी में विस्तृत स्क्रीनशॉट्स व प्रॉम्प्ट्स के साथ।</li>
<li><strong>परीक्षित एवं विश्वसनीय टूल्स:</strong> केवल टेस्ट किए गए और काम करने वाले AI टूल्स का निष्पक्ष विश्लेषण।</li>
<li><strong>स्मार्ट AI सारांश:</strong> हर आर्टिकल को एक क्लिक में AI की मदद से सारांशित करने की सुविधा।</li>
</ul>`,
  },
  'contact-us': {
    title: 'Contact Us – Aitoolhindi.online',
    excerpt: 'हमसे संपर्क करें। किसी भी प्रश्न, सुझाव या सहयोग के लिए हमारे संपर्क विवरण देखें।',
    content: `<h2>संपर्क करें (Contact Us)</h2>
<p>यदि आपके पास कोई प्रश्न, सुझाव, टूल रिव्यू का अनुरोध या व्यावसायिक सहयोग का प्रस्ताव है, तो आप हमसे सीधे संपर्क कर सकते हैं:</p>
<ul>
<li><strong>ईमेल (Email):</strong> khabarpanel@gmail.com</li>
<li><strong>वेबसाइट:</strong> https://aitoolhindi.online</li>
<li><strong>प्रतिक्रिया समय:</strong> हम सामान्यतः 24 से 48 घंटों के भीतर उत्तर देते हैं।</li>
</ul>
<p>आप हमारे सोशल मीडिया चैनल्स और ब्लॉग के माध्यम से भी नियमित अपडेट प्राप्त कर सकते हैं।</p>`,
  },
  'privacy-policy': {
    title: 'Privacy Policy – Aitoolhindi.online',
    excerpt: 'Aitoolhindi.online की गोपनीयता नीति (Privacy Policy) और डेटा सुरक्षा दिशानिर्देश।',
    content: `<h2>गोपनीयता नीति (Privacy Policy)</h2>
<p>Aitoolhindi.online पर हमारे आगंतुकों की गोपनीयता अत्यंत महत्वपूर्ण है। यह गोपनीयता नीति दस्तावेज़ रूपरेखा प्रस्तुत करता है कि Aitoolhindi.online द्वारा किस प्रकार की व्यक्तिगत जानकारी प्राप्त और एकत्र की जाती है और उसका उपयोग कैसे किया जाता है।</p>
<h3>कुकीज़ और वेब बीकन (Cookies)</h3>
<p>हम यूजर की प्राथमिकताओं, उपयोगकर्ता-विशिष्ट जानकारी को रिकॉर्ड करने और वेबसाइट के अनुभव को बेहतर बनाने के लिए कुकीज़ का उपयोग कर सकते हैं।</p>
<h3>गूगल एडसेंस और एनालिटिक्स</h3>
<p>गूगल हमारे तृतीय-पक्ष विक्रेताओं में से एक है जो हमारी साइट पर विज्ञापनों और एनालिटिक्स के लिए कुकीज़ का उपयोग करता है। आप Google की विज्ञापन गोपनीयता नीति पर जाकर DART कुकीज़ के उपयोग को ऑप्ट-आउट कर सकते हैं।</p>`,
  },
  'terms-conditions': {
    title: 'Terms & Conditions – Aitoolhindi.online',
    excerpt: 'Aitoolhindi.online के नियम व शर्तें।',
    content: `<h2>नियम और शर्तें (Terms & Conditions)</h2>
<p>Aitoolhindi.online पर आने और उपयोग करने पर आप निम्नलिखित नियमों और शर्तों से बंधे होने के लिए सहमत होते हैं।</p>
<h3>सामग्री का उपयोग</h3>
<p>इस वेबसाइट पर प्रकाशित सभी ट्यूटोरियल्स, प्रॉम्प्ट्स, आर्टिकल्स और सामग्री केवल शैक्षिक और सूचनात्मक उद्देश्यों के लिए हैं। बिना लिखित अनुमति के सामग्री का पुनरुत्पादन प्रतिबंधित है।</p>`,
  },
  'disclaimer': {
    title: 'Disclaimer – Aitoolhindi.online',
    excerpt: 'Aitoolhindi.online का अस्वीकरण (Disclaimer)।',
    content: `<h2>अस्वीकरण (Disclaimer)</h2>
<p>Aitoolhindi.online पर दी गई सभी जानकारी सद्भावनापूर्वक और केवल सामान्य सूचनात्मक व शैक्षिक उद्देश्यों के लिए प्रकाशित की गई है। AI टूल्स और सॉफ्टवेयर की नीतियां, फीचर्स और कीमतें समय-समय पर बदल सकती हैं। किसी भी सेवा का उपयोग करने से पहले कृपया संबंधित टूल की आधिकारिक वेबसाइट पर नियम जांचें।</p>`,
  },
  'correction-policy': {
    title: 'Correction Policy – Aitoolhindi.online',
    excerpt: 'Aitoolhindi.online की सुधार नीति।',
    content: `<h2>सुधार नीति (Correction Policy)</h2>
<p>Aitoolhindi.online सटीक और अद्यतन जानकारी प्रदान करने के लिए प्रतिबद्ध है। यदि किसी आर्टिकल में कोई तथ्यात्मक त्रुटि पाई जाती है, तो हम तुरंत उसकी समीक्षा करते हैं और सुधार प्रकाशित करते हैं। यदि आप कोई त्रुटि देखते हैं, तो कृपया khabarpanel@gmail.com पर हमें सूचित करें।</p>`,
  },
  'fact-checking-policy': {
    title: 'Fact-Checking Policy – Aitoolhindi.online',
    excerpt: 'Aitoolhindi.online की तथ्य जांच नीति।',
    content: `<h2>तथ्य जांच नीति (Fact-Checking Policy)</h2>
<p>हमारे सभी ट्यूटोरियल और समीक्षाएं वास्तविक परीक्षण और सत्यापन के बाद ही प्रकाशित की जाती हैं। हम टूल्स के दावों की पुष्टि करते हैं ताकि हमारे पाठकों को सटीक व विश्वसनीय जानकारी मिले।</p>`,
  },
  'dmca-policy': {
    title: 'DMCA Policy – Aitoolhindi.online',
    excerpt: 'Aitoolhindi.online की कॉपीराइट और DMCA नीति।',
    content: `<h2>DMCA नीति (DMCA Notice)</h2>
<p>Aitoolhindi.online दूसरों के बौद्धिक संपदा अधिकारों का सम्मान करता है। यदि आपको लगता है कि आपकी कॉपीराइट सामग्री हमारी वेबसाइट पर अनुचित तरीके से उपयोग की गई है, तो कृपया उचित साक्ष्य के साथ khabarpanel@gmail.com पर नोटिस भेजें।</p>`,
  },
  'dnpa-code-of-ethics': {
    title: 'DNPA Code of Ethics – Aitoolhindi.online',
    excerpt: 'डिजिटल समाचार प्रकाशक संघ (DNPA) आचार संहिता।',
    content: `<h2>DNPA Code of Ethics</h2>
<p>हम डिजिटल सामग्री निर्माण में उच्चतम पत्रकारिता मानकों और पारदर्शिता का पालन करते हैं। सामग्री किसी भी प्रकार के भ्रामक प्रचार से मुक्त और तथ्य-आधारित होती है।</p>`,
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).toLowerCase().replace(/\/+$/, '').trim();
  const posts = await getPostsServer();

  const post = posts.find((p) => {
    const pSlug = (p.slug || '').replace(/\/+$/, '').trim().toLowerCase();
    const pId = (p.id || '').replace(/^blog-/, '').trim().toLowerCase();
    return (
      pSlug === cleanSlug ||
      pId === cleanSlug ||
      p.id === cleanSlug ||
      p.id === `blog-${cleanSlug}`
    );
  });

  if (post) {
    return {
      title: `${post.title} | Aitoolhindi.online`,
      description: post.metaDescription || post.excerpt || post.title,
      openGraph: {
        title: post.title,
        description: post.metaDescription || post.excerpt || post.title,
        images: post.image ? [{ url: post.image, alt: post.imageAlt || post.title }] : undefined,
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.metaDescription || post.excerpt || post.title,
        images: post.image ? [post.image] : undefined,
      },
    };
  }

  // Check if static legal/about page
  if (STATIC_PAGES[cleanSlug]) {
    const staticPage = STATIC_PAGES[cleanSlug];
    return {
      title: `${staticPage.title} | Aitoolhindi.online`,
      description: staticPage.excerpt,
    };
  }

  // Check if category
  const foundCat = posts.find(
    (p) =>
      p.category &&
      p.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === cleanSlug
  )?.category;

  if (foundCat) {
    return {
      title: `${foundCat} Tutorials & Guides | Aitoolhindi.online`,
      description: `सभी ${foundCat} से संबंधित हिंदी AI ट्यूटोरियल और गाइड्स पढ़ें।`,
    };
  }

  return {
    title: 'Aitoolhindi.online – हिंदी AI ट्यूटोरियल और टूल्स गाइड',
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).toLowerCase().replace(/\/+$/, '').trim();
  const posts = await getPostsServer();
  const publishedPosts = posts.filter((p) => p.status !== 'draft');

  let post =
    publishedPosts.find((p) => {
      const pSlug = (p.slug || '').replace(/\/+$/, '').trim().toLowerCase();
      const pId = (p.id || '').replace(/^blog-/, '').trim().toLowerCase();
      return (
        pSlug === cleanSlug ||
        pId === cleanSlug ||
        p.id === cleanSlug ||
        p.id === `blog-${cleanSlug}`
      );
    }) || null;

  let foundCat =
    publishedPosts.find(
      (p) =>
        p.category &&
        p.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') === cleanSlug
    )?.category || null;

  // If static page like about-us, privacy-policy, etc.
  if (!post && !foundCat && STATIC_PAGES[cleanSlug]) {
    const pageData = STATIC_PAGES[cleanSlug];
    post = {
      id: `static-${cleanSlug}`,
      slug: cleanSlug,
      title: pageData.title,
      excerpt: pageData.excerpt,
      content: pageData.content,
      category: 'Information',
      author: 'Aitoolhindi Team',
      date: new Date().toLocaleDateString('hi-IN'),
      readTime: '3 min read',
      image: 'https://picsum.photos/seed/aitoolhindi/800/450',
      imageAlt: pageData.title,
      status: 'published',
      createdAt: 1740000000000,
    };
  }

  if (!post && !foundCat) {
    notFound();
  }

  return (
    <ArticleViewClient
      initialPost={post}
      initialMatchedCategory={foundCat}
      initialPosts={publishedPosts}
      cleanSlug={cleanSlug}
    />
  );
}
