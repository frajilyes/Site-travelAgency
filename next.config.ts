import type { NextConfig } from 'next';

const production = process.env.NODE_ENV === 'production';

const HSTS = { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' };

const nextConfig: NextConfig = {
  serverExternalPackages: ['nodemailer'],

  poweredByHeader: false,

  productionBrowserSourceMaps: false,

  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '512kb',
    },
  },

  turbopack: {
    root: __dirname,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          {
            key: 'Permissions-Policy',
            value:
              'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), interest-cohort=()',
          },
          ...(production ? [HSTS] : []),
        ],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
