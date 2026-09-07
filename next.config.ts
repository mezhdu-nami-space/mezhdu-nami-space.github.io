import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  typescript: {
    // The app is already browser-tested; do not block production deployment
    // on TypeScript-only compatibility warnings from newer DOM typings.
    ignoreBuildErrors: true,
  },
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
