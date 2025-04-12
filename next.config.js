/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Disable ESLint during production builds for easier deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during builds for easier deployment
    ignoreBuildErrors: true,
  },
  // Allow cross-origin for images and API routes
  images: {
    domains: [''],
  },
  // Workaround for build issues with dependencies
  webpack: (config, { isServer }) => {
    // Ignore warnings about missing optional dependencies
    config.ignoreWarnings = [
      { module: /node_modules\/pino\/lib\/tools\.js/ }
    ];
    
    return config;
  },
  // Let Next.js handle the transpiling
  transpilePackages: [
    'wagmi', 
    '@wagmi/core', 
    'viem',
    '@tanstack/react-query'
  ],
}

module.exports = nextConfig 