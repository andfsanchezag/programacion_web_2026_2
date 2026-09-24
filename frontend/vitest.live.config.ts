import { defineConfig } from 'vitest/config';

// Suite live (F7): smoke contra el backend real. Excluida del `npm test`
// unitario; se ejecuta con `npm run test:live`. Requiere backend en
// LIVE_BASE_URL (default http://localhost:8080) y empleados seed del backend
// (scripts/seed-data.ts): seed-teller/seed-operator/seed-supervisor/
// seed-commercial/seed-analyst. No muta datos ajenos: todo lo creado usa
// sufijo único de corrida.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/live/**/*.test.ts'],
    testTimeout: 180000,
    hookTimeout: 180000,
  },
});
