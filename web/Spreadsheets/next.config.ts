import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  basePath: "",
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
