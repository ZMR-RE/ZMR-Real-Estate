import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts (whose `defineConfig` comes from 'vite' and
// has no `test` field) rather than extending it, so the existing build
// config is untouched by adding a test runner. Node environment is
// sufficient today — every test in this suite exercises pure logic
// (validation/error-interpretation helpers), not rendered components.
export default defineConfig({
  test: {
    environment: 'node',
  },
})
