import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: true, // Enforce trailing slashes (/) for 100% WordPress URL compatibility & SEO ranking preservation
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image patterns.
  images: {
    minimumCacheTTL: 604800, // 7 days image cache
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'aitoolhindi.online',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'aitoolhindi.online',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.aitoolhindi.online',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.aitoolhindi.online',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 604800, // 7 days client router cache for visited pages
      static: 604800,
    },
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/wp-content/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/((?!api|sw\\.js|_next/webpack-hmr|__nextjs).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
