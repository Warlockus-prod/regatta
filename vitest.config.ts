import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Vitest needs to resolve `@/...` the way Next.js does. tsconfig has
// `"@/*": ["./src/*"]` for the IDE; mirror that here so test files
// (and the src modules they import) can use the same import paths.
export default defineConfig({
  // The web suite also exercises pure native adapters and the offline Link.
  // A string keeps Vite on the complete web config instead of discovering
  // mobile/tsconfig.json, whose Expo base is absent in root-only CI installs.
  esbuild: {
    tsconfigRaw: readFileSync(path.resolve(__dirname, 'tsconfig.json'), 'utf8'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    environment: 'node',
  },
});
