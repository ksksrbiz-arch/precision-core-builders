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
