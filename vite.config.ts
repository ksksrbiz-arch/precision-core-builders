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
    sourcemap: false, // Disable sourcemaps in production for security
    // Split large vendors into separate chunks so the main bundle stays small
    // and browser caching is more granular.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Framer Motion is large (~90 kB gz) — isolate it so pages that
          // don't animate don't pay the cost.
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-framer";
          }
          // tRPC + superjson in their own chunk
          if (
            id.includes("node_modules/@trpc") ||
            id.includes("node_modules/superjson")
          ) {
            return "vendor-trpc";
          }
          // Supabase auth SDK
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          // Radix UI primitives (bundled with shadcn) can be large
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          // Lucide icons
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-lucide";
          }
          // React + React-DOM stay in the default "vendor" chunk
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/")
          ) {
            return "vendor-react";
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
      // Deny access to parent directories and hidden files
      deny: [
        "**/.*",
        "**/.git/**",
        "**/node_modules/**",
        "**/package.json",
        "**/package-lock.json",
        "**/pnpm-lock.yaml",
        "**/.env*",
      ],
      // Only allow access to specific directories
      allow: [
        path.resolve(import.meta.dirname, "client"),
        path.resolve(import.meta.dirname, "shared"),
      ],
    },
    // Prevent server.fs.deny bypass
    strictPort: true,
    cors: {
      origin: false, // Disable CORS in development to prevent external requests
    },
  },
});
