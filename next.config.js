/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  devIndicators: false,
  allowedDevOrigins: [
    "*.macaly.dev",
    "*.macaly.app",
    "*.macaly-app.com",
    "*.macaly-user-data.dev",
  ],
  output: 'standalone', // Added for Docker containerization
  
  // Add scripts to head for monitoring
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.applicationinsights.azure.com https://*.monitor.azure.com; connect-src 'self' https://*.applicationinsights.azure.com https://*.monitor.azure.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-src 'self'",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
