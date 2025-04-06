import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    workspace: ['packages/*'],
    coverage: {
      exclude: ['**/__mocks__/**', ...coverageConfigDefaults.exclude],
      enabled: true,
      provider: 'istanbul'
    },
  },
})
