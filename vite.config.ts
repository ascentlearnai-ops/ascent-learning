import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Local proxy to simulate Vercel Serverless Functions during `npm run dev`
const vercelApiFallback = () => ({
  name: 'vercel-api-fallback',
  configureServer(server: any) {
    server.middlewares.use('/api/generate', async (req: any, res: any, next: any) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const parsedBody = JSON.parse(body);
            // Dynamically load the Vercel function
            const { default: handler } = await server.ssrLoadModule('/api/generate.ts');

            const mockReq = {
              method: 'POST',
              body: parsedBody,
              headers: req.headers,
              connection: req.connection || { remoteAddress: '127.0.0.1' }
            };

            const mockRes = {
              status: (code: number) => {
                res.statusCode = code;
                return mockRes;
              },
              json: (data: any) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              }
            };

            await handler(mockReq, mockRes);
          } catch (e: any) {
            console.error("Local API Error:", e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message || "Local Serverless Function Error" }));
          }
        });
      } else {
        next();
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), vercelApiFallback()],

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
    esbuildOptions: {
      target: 'es2022'
    }
  },

  server: {
    port: 3000,
    strictPort: false,
  },

  preview: {
    port: 3000,
  },
});
