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
    // Încărcarea la ridicare și confirmarea clientului trimit câte 4 fotografii (comprimate în browser).
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
