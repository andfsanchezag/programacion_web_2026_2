import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // E2E (test/e2e) requiere el entorno Docker levantado: se ejecuta con
    // `npm run test:e2e`, nunca dentro del `npm test` unitario.
    exclude: ['test/e2e/**', 'node_modules/**'],
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['application/**/*.ts'],
      exclude: ['application/domain/index.ts', 'application/domain/ports/**'],
    },
  },
});