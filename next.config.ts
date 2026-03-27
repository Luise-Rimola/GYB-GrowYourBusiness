import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: false,
  env: {
    DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
  },
};

export default nextConfig;
