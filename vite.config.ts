// bisiyata dishmaya, leharbot ahava biyisral
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fromRoot('./src') } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        app: fromRoot('./app.html'),
        print: fromRoot('./print.html'),
        'service-worker': fromRoot('./src/background/service-worker.ts'),
      },
      output: {
        // The manifest points at a fixed service worker file name.
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker' ? 'service-worker.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
