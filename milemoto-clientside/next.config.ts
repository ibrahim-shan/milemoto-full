import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // compiler: {
  //   removeConsole: true,
  // },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'milemoto.local',
      },
    ],
  },
  async rewrites() {
    const devApiOrigin = process.env.NEXT_PUBLIC_DEV_API || 'http://localhost:4000';
    return process.env.NODE_ENV === 'production'
      ? []
      : [
          {
            source: '/api/:path*',
            destination: `${devApiOrigin}/api/:path*`,
          },
        ];
  },
};

export default nextConfig;
