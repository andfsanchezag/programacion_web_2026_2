import { defineConfig } from 'vitest/config';

// Suite E2E (Fase 6): requiere `docker compose up -d` (API + MySQL + Mongo).
// Uso: E2E_BASE_URL=http://localhost:8080 npm run test:e2e
export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
