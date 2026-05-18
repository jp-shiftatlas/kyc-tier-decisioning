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
    // .claude/** excluded per Batch 11A Dispatch 2 housekeeping — vitest's
    // **/*.test.ts glob would otherwise walk ephemeral worktrees under
    // .claude/worktrees/* and inflate the test count (the 1026-vs-674
    // inflation surfaced in Dispatch 1). Regression guard for the
    // multi-worktree glob trap; no effect on default-state tooling.
    exclude: ['node_modules', '.next', 'tests/e2e/**', 'tests/smoke/**', '.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  define: {},
});
