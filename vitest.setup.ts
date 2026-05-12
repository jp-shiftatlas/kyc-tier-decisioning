import '@testing-library/jest-dom/vitest';

// Test imports of .md files return raw strings via the md-as-raw Vite plugin in vitest.config.ts.
// To stub a specific .md content in a test: vi.mock('@/prompts/pass_1_system_prompt.md', () => ({ default: '...' }))
