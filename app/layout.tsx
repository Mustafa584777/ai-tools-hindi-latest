import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans } from 'next/font/google';
import CacheRegistrar from '@/components/CacheRegistrar';
import './globals.css'; // Global styles

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aitoolhindi.online – भारत का नंबर 1 हिंदी AI ट्यूटोरियल और टूल्स गाइड',
  description: 'हिंदी में सीखें आर्टिफिशियल इंटेलिजेंस, ChatGPT, Midjourney, AI टूल्स और प्रॉम्प्ट इंजीनियरिंग की पूरी जानकारी।',
  openGraph: {
    title: 'Aitoolhindi.online – भारत का नंबर 1 हिंदी AI ट्यूटोरियल और टूल्स गाइड',
    description: 'हिंदी में सीखें आर्टिफिशियल इंटेलिजेंस, ChatGPT, Midjourney, AI टूल्स और प्रॉम्प्ट इंजीनियरिंग की पूरी जानकारी।',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aitoolhindi.online – भारत का नंबर 1 हिंदी AI ट्यूटोरियल और टूल्स गाइड',
    description: 'हिंदी में सीखें आर्टिफिशियल इंटेलिजेंस, ChatGPT, Midjourney, AI टूल्स और प्रॉम्प्ट इंजीनियरिंग की पूरी जानकारी।',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 0.8,
  maximumScale: 2.0,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <head>
        {/* Google tag (gtag.js) deferred until after load */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RRHCK8H04T"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-RRHCK8H04T');
          `}
        </Script>
      </head>
      <body
        suppressHydrationWarning
        className={`${plusJakarta.className} bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col`}
      >
        <CacheRegistrar />
        {children}
      </body>
    </html>
  );
}
