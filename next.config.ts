import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // VPS is shared — silence the multi-lockfile root warning
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
