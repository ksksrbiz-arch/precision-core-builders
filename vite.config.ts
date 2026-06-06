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
    // NOTE: Custom manualChunks previously black-screened prod twice (Apr 16 and
    // Apr 21) due to cross-chunk export reference / init-order issues — those were
    // caused by splitting React out from its consumers AND by funneling all of
    // node_modules into one eager "vendor" chunk (which defeats Vite's automatic
    // per-route code splitting). To stay safe we ONLY carve out self-contained
    // leaf libraries (recharts/d3 charting, framer-motion) that have no module-init
    // coupling with React, and we let Vite handle React and everything else with
    // its default safe chunking. Do NOT add a catch-all `return "vendor"` here.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          // Charting stack: heavy and only used on a few routes.
          if (
            /[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|internmap)[\\/]/.test(
              id
            )
          ) {
            return "charts";
          }
          // Animation library: large and self-contained.
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) {
            return "motion";
          }
          // Everything else: defer to Vite's default chunking, which preserves
          // safe import ordering and lazy-route splitting.
          return undefined;
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
