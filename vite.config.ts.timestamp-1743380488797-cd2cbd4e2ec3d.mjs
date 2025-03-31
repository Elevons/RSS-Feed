// vite.config.ts
import { defineConfig } from "file:///C:/Users/Jordan%20Elevons/Dropbox/0-Active/14%20-%20RSS%20Feed/RSS-Feed/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Jordan%20Elevons/Dropbox/0-Active/14%20-%20RSS%20Feed/RSS-Feed/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Jordan Elevons\\Dropbox\\0-Active\\14 - RSS Feed\\RSS-Feed";
var vite_config_default = defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
    esbuildOptions: {
      define: {
        global: "globalThis"
      }
    }
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
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: ["es2021", "chrome105", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG
  },
  resolve: {
    alias: {
      "@tauri-apps/api/dialog": path.resolve(__vite_injected_original_dirname, "./src/shims/tauri-api/dialog.ts"),
      "@tauri-apps/api/fs": path.resolve(__vite_injected_original_dirname, "./src/shims/tauri-api/fs.ts")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxKb3JkYW4gRWxldm9uc1xcXFxEcm9wYm94XFxcXDAtQWN0aXZlXFxcXDE0IC0gUlNTIEZlZWRcXFxcUlNTLUZlZWRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEpvcmRhbiBFbGV2b25zXFxcXERyb3Bib3hcXFxcMC1BY3RpdmVcXFxcMTQgLSBSU1MgRmVlZFxcXFxSU1MtRmVlZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvSm9yZGFuJTIwRWxldm9ucy9Ecm9wYm94LzAtQWN0aXZlLzE0JTIwLSUyMFJTUyUyMEZlZWQvUlNTLUZlZWQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgZGVmaW5lOiB7XG4gICAgICAgIGdsb2JhbDogJ2dsb2JhbFRoaXMnLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICAvLyBWaXRlIG9wdGlvbnMgdGFpbG9yZWQgZm9yIFRhdXJpIGRldmVsb3BtZW50XG4gIC8vIGh0dHBzOi8vdGF1cmkuYXBwL3YyL2d1aWRlcy9mcm9udGVuZC9iZXN0LXByYWN0aWNlcy9cbiAgY2xlYXJTY3JlZW46IGZhbHNlLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAxNDIxLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgaG1yOiB7XG4gICAgICBvdmVybGF5OiBmYWxzZVxuICAgIH1cbiAgfSxcbiAgZW52UHJlZml4OiBbJ1ZJVEVfJywgJ1RBVVJJXyddLFxuICBidWlsZDoge1xuICAgIHRhcmdldDogWydlczIwMjEnLCAnY2hyb21lMTA1JywgJ3NhZmFyaTEzJ10sXG4gICAgbWluaWZ5OiAhcHJvY2Vzcy5lbnYuVEFVUklfREVCVUcgPyAnZXNidWlsZCcgOiBmYWxzZSxcbiAgICBzb3VyY2VtYXA6ICEhcHJvY2Vzcy5lbnYuVEFVUklfREVCVUcsXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0B0YXVyaS1hcHBzL2FwaS9kaWFsb2cnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvc2hpbXMvdGF1cmktYXBpL2RpYWxvZy50cycpLFxuICAgICAgJ0B0YXVyaS1hcHBzL2FwaS9mcyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9zaGltcy90YXVyaS1hcGkvZnMudHMnKVxuICAgIH1cbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFZLFNBQVMsb0JBQW9CO0FBQ2xhLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsSUFDeEIsZ0JBQWdCO0FBQUEsTUFDZCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQTtBQUFBLEVBR0EsYUFBYTtBQUFBLEVBQ2IsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osS0FBSztBQUFBLE1BQ0gsU0FBUztBQUFBLElBQ1g7QUFBQSxFQUNGO0FBQUEsRUFDQSxXQUFXLENBQUMsU0FBUyxRQUFRO0FBQUEsRUFDN0IsT0FBTztBQUFBLElBQ0wsUUFBUSxDQUFDLFVBQVUsYUFBYSxVQUFVO0FBQUEsSUFDMUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxjQUFjLFlBQVk7QUFBQSxJQUMvQyxXQUFXLENBQUMsQ0FBQyxRQUFRLElBQUk7QUFBQSxFQUMzQjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsMEJBQTBCLEtBQUssUUFBUSxrQ0FBVyxpQ0FBaUM7QUFBQSxNQUNuRixzQkFBc0IsS0FBSyxRQUFRLGtDQUFXLDZCQUE2QjtBQUFBLElBQzdFO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
