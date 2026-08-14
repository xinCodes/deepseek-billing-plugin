import { defineConfig } from 'vitest/config'

// Standalone test scope: the self-contained host package. The client plugin's
// specs (slot/locale/component suites) run inside a full deepseek-harness
// checkout and are shipped here for reference only.
export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.spec.ts'],
    exclude: ['packages/ui-deepseek-billing/**', '**/node_modules/**'],
    environment: 'node',
  },
})
