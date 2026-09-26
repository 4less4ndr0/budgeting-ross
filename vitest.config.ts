import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts on purpose: keeping the `test` field out of the config
// that tsc -b type-checks avoids a duplicate-`vite`-package type clash between the
// top-level `vite` and the copy vitest bundles internally. Not part of the app build.
export default defineConfig({
  test: {
    environment: 'node',
  },
});
