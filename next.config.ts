import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: false,
  /** Kleinere Client-Bundles: nur genutzte Exports aus „Barrel“-Paketen auflösen. */
  experimental: {
    optimizePackageImports: ["recharts", "date-fns", "@radix-ui/react-popover", "@uiw/react-json-view"],
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
  },
  /**
   * jsPDF ships a code path with `import("html2canvas")` (html plugin). We do not install the
   * stock package; map the bare specifier to `html2canvas-pro` (same API, oklch-safe).
   */
  turbopack: {
    resolveAlias: {
      html2canvas: "html2canvas-pro",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      html2canvas: path.resolve(process.cwd(), "node_modules/html2canvas-pro"),
    };
    return config;
  },
};

export default nextConfig;
