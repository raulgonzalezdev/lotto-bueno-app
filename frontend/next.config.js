/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  "output": "export",
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
  }
  ,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "upgrade-insecure-requests"
          }
        ]
      }
    ]
  }
};

// Set assetPrefix only in production/export mode
if (process.env.NODE_ENV === 'production') {
  nextConfig.assetPrefix = '/static';
}

module.exports = nextConfig;
