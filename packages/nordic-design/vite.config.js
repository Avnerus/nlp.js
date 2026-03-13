import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
  },
});
