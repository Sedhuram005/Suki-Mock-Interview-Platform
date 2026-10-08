import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  devIndicators: false,
  images: {
    qualities: [75, 100],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
