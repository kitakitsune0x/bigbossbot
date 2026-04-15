import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  // Disable Next.js fetch cache globally — we handle our own polling intervals
  experimental: {
    serverComponentsHmrCache: false,
  },
};

export default nextConfig;
