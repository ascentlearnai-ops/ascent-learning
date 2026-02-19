import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'icons': ['lucide-react'],
        },
      },
    },
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  
  server: {
    port: 3000,
    strictPort: false,
  },
  
  preview: {
    port: 3000,
  },
});
