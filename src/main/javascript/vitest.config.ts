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
      // Excluidos del reporte unitario con justificación:
      // - server.ts, bootstrap.ts, datasource.ts: cableado de infraestructura y
      //   entrypoint; exigen DB vivas y se cubren en runtime con la suite E2E
      //   (test:e2e), el seed (npm run seed) y el smoke de integración.
      // - dtos.ts, entities.ts, AuditLogDocument.ts: solo interfaces/contratos
      //   de tipos, sin código ejecutable.
      exclude: [
        'application/domain/index.ts',
        'application/domain/ports/**',
        'application/server.ts',
        'application/infrastructure/database/**',
        'application/adapters/rest/dtos/dtos.ts',
        'application/adapters/persistence/typeorm/entities/entities.ts',
        'application/adapters/persistence/mongoose/documents/AuditLogDocument.ts',
      ],
    },
  },
});