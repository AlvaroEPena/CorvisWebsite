import { defineConfig } from 'vitest/config';

// Standalone config: the project's own vitest config only includes src/tests.
// Run: npx vitest run --config scripts/demo-grit/vitest.config.mjs
export default defineConfig({
  test: { include: ['scripts/demo-grit/**/*.test.mjs'], environment: 'node' },
});
