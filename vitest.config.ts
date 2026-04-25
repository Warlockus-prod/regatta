import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Vitest needs to resolve `@/...` the way Next.js does. tsconfig has
// `"@/*": ["./src/*"]` for the IDE; mirror that here so test files
// (and the src modules they import) can use the same import paths.
export default defineConfig({
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
