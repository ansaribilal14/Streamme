/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow next/image to load TMDB and other image hosts
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**' },
    ],
    unoptimized: true,
  },
  // Make build tolerant of client-only packages
  experimental: { esmExternals: false },
};

export default nextConfig;
