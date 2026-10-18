import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // mobile/ has its own ESLint config (run via `cd mobile && npm run check`).
    "mobile/**",
    // Photoshop ExtendScript, not parseable as modern JS.
    "scripts/photoshop/**",
  ]),
]);

export default eslintConfig;
