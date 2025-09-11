import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For Netlify deployment
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Ignore ESLint during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
