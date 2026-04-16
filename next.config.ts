import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin workspace root so Next/Turbopack doesn't walk up to /Users/Andrey and
  // get confused by unrelated parent package.json files.
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
