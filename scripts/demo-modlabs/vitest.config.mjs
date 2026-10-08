import { defineConfig } from 'vitest/config';

// Standalone config: the project's own vitest config only includes src/tests.
// Run: npx vitest run --config scripts/demo-modlabs/vitest.config.mjs
export default defineConfig({
  test: { include: ['scripts/demo-modlabs/**/*.test.mjs'], environment: 'node' },
});
