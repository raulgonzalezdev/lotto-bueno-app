/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  "output": "standalone",
  env: {
    HOST: process.env.HOST
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  jest: {
    enabled: false
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://applottobueno.com/api/:path*',
      },
    ];
  }
};

// Set assetPrefix only in production/export mode
if (process.env.NODE_ENV === 'production') {
  nextConfig.assetPrefix = '/static';
}

module.exports = nextConfig;
