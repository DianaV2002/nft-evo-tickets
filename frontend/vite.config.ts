import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from root .env
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');

  return {
    plugins: [
      react(),
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        protocolImports: true,
      }),
    ],
    server: {
      host: "::",
      port: 8080,
      strictPort: true, // Fail if port 8080 is already in use (instead of using 8081)
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        buffer: 'buffer',
      },
    },
    define: {
      'process.env': {},
      global: 'globalThis',
      // Expose PINATA env variables to the frontend
      'import.meta.env.PINATA_JWT': JSON.stringify(env.PINATA_JWT),
      'import.meta.env.PINATA_GATEWAY': JSON.stringify(env.PINATA_GATEWAY),
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
  };
});
