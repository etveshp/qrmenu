import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Playwright e2e specs live in ./e2e — keep them out of Vitest.
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
});
