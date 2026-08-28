import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/*.test.ts'],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: false,
  },
});
