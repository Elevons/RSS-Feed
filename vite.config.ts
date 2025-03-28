import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  // Vite options tailored for Tauri development
  // https://tauri.app/v2/guides/frontend/best-practices/
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
    hmr: {
      overlay: false
    }
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome105', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  resolve: {
    alias: {
      '@tauri-apps/api/dialog': path.resolve(__dirname, './src/shims/tauri-api/dialog.ts'),
      '@tauri-apps/api/fs': path.resolve(__dirname, './src/shims/tauri-api/fs.ts')
    }
  }
});
