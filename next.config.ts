import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enables static export
  images: {
    unoptimized: true, // Required for static export as Next.js image optimization needs a server
  },
  // If you use basePath or other specific routing, we might need to adjust this for Capacitor
};

export default nextConfig;
