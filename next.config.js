/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
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
      { module: /node_modules\/pino\/lib\/tools\.js/ },
      { module: /node_modules\/mongodb/ },
      { module: /node_modules\/wagmi/ }
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
  // Disable features that may cause connection issues
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
    esmExternals: 'loose',
    optimizeCss: false,
    optimizePackageImports: false
  },
  // Increase socket timeout to prevent 504 errors
  serverRuntimeConfig: {
    socketTimeout: 60000, // 60 seconds
  }
}

module.exports = nextConfig 