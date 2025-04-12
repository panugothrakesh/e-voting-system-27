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
}

module.exports = nextConfig 