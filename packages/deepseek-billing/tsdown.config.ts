import { defineConfig } from 'tsdown'

// Plain Node library build (no Typert services, no browser bundle): the Host
// pass consumes lib/types/index.js emitted by tsc. Package-local config
// replaces the root workspace layout for this package.
export default defineConfig({
  entry: ['lib/types/index.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
