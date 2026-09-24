/** Setup global de Vitest (F7): matchers jest-dom + limpieza de RTL. */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
