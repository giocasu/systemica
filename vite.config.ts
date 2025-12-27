import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/prod-cons/' : '/',
  optimizeDeps: {
    exclude: ['quickjs-emscripten']
  },
  build: {
    target: 'esnext'
  }
}));
