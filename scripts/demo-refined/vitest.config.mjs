import { defineConfig } from 'vitest/config';

// Standalone config: the project's own vitest config is Astro-aware and only includes src/tests.
// Run: npx vitest run --config scripts/demo-refined/vitest.config.mjs
export default defineConfig({
  test: { include: ['scripts/demo-refined/**/*.test.mjs'], environment: 'node' },
});
