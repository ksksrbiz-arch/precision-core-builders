import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Slightly raise the warning threshold to avoid noise from legitimate
    // lazy-loaded chunks (excalidraw, recharts, etc.) — actual code splitting
    // is handled by manualChunks below.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id): string | void {
          // React core — loaded on every page, keep together for caching.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
            return "vendor-react";
          }
          // Framer Motion — large animation lib used on public pages.
          if (/node_modules\/framer-motion\//.test(id)) {
            return "vendor-framer-motion";
          }
          // tRPC + React Query — data layer shared across all pages.
          if (/node_modules\/(@trpc|@tanstack)\//.test(id)) {
            return "vendor-data";
          }
          // Radix UI primitives — shared component layer.
          if (/node_modules\/@radix-ui\//.test(id)) {
            return "vendor-radix";
          }
          // Recharts — only used in admin Analytics.
          if (/node_modules\/recharts\//.test(id)) {
            return "vendor-recharts";
          }
          // Everything else in node_modules goes in a general vendor chunk.
          if (/node_modules\//.test(id)) {
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 3000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
