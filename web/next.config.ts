import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default bottom-left position overlaps the dashboard sidebar's
  // "Sign out" link — dev-mode only, doesn't affect production builds.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
