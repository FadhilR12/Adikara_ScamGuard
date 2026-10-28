import { crx } from '@crxjs/vite-plugin';
import { defineConfig } from 'vite';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: { target: 'chrome116', emptyOutDir: true },
  server: { port: 5174, strictPort: true, hmr: { port: 5174 } },
});
