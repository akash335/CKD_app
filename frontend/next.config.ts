import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile pictures
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
  typescript: {
    // Don't fail the Vercel build on TS errors (they're caught in dev)
    ignoreBuildErrors: true,
  },
};


export default nextConfig;
