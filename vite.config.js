import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('chart.js')) {
            return 'vendor-chart';
          }
          if (id.includes('crypto-js')) {
            return 'vendor-crypto';
          }
          if (id.includes('canvas-confetti')) {
            return 'vendor-confetti';
          }
        }
      }
    }
  }
});
