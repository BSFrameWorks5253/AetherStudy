import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
const isElectron = process.env.VITE_TARGET === 'electron' || process.env.ELECTRON === 'true';

export default defineConfig({
  plugins: [react()],
  base: isElectron ? './' : '/', // Root '/' for Web/PWA/Vercel (fixes nested route refresh 404), './' for Electron file://
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
