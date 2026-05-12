import { defineConfig } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';

export default defineConfig({
  plugins: [
    {
      name: 'md-as-raw',
      enforce: 'pre',
      transform(_code, id) {
        if (id.endsWith('.md')) {
          const source = fs.readFileSync(id, 'utf-8');
          return { code: `export default ${JSON.stringify(source)};`, map: null };
        }
        return null;
      },
    },
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  define: {},
});
