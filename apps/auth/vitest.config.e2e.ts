import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
  },
  plugins: [swc.vite()],
  resolve: {
    alias: {
      src: resolve(__dirname, './src'),
    },
  },
});
