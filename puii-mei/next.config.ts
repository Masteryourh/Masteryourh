import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
  experimental: {
    // Confirmarea primirii trimite 4 fotografii (comprimate în browser).
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
