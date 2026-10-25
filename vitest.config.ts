import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
    },
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './src/config'),
      '@common': path.resolve(__dirname, './src/common'),
      '@core': path.resolve(__dirname, './src/core'),
      '@database': path.resolve(__dirname, './src/database'),
      '@errors': path.resolve(__dirname, './src/errors'),
      '@logger': path.resolve(__dirname, './src/logger'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@redis': path.resolve(__dirname, './src/redis'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@types': path.resolve(__dirname, './src/types'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@docs': path.resolve(__dirname, './src/docs'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
