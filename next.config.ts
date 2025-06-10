import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Force dynamic rendering to avoid static generation issues
  trailingSlash: false,
  poweredByHeader: false,
};

export default nextConfig;
