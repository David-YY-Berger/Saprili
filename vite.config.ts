// bisiyata dishmaya, leharbot ahava biyisral
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  define: {
    __SAPRILI_PROVIDER__: JSON.stringify(
      process.env.SAPRILI_PROVIDER === 'mock' ? 'mock' : 'gemini',
    ),
    __SAPRILI_MOCK_DELAY_MS__: JSON.stringify(Number(process.env.SAPRILI_MOCK_DELAY_MS ?? 0) || 0),
  },
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
