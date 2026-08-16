import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  // React plugin is required so Vitest 4 can parse .tsx files when
  // tsconfig's jsx is "preserve" (the app build uses @vitejs/plugin-react
  // for the same reason).
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    // Tests exercise the dev-admin-token bypass (see
    // server/_core/auth/verifyToken.ts), which now requires this explicit
    // opt-in in addition to NODE_ENV !== "production" — set it only for the
    // test runner's own process, the same way a developer would set it in
    // their local .env. Never set this in Netlify's environment variables.
    env: {
      ALLOW_DEV_ADMIN_BYPASS: "true",
    },
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      // All Netlify function tests — one glob so new suites (e.g.
      // rate-limiter, admin-auth) run without having to be registered here.
      "netlify/functions/__tests__/**/*.test.ts",
      "client/src/components/**/*.test.{ts,tsx}",
      "client/src/pages/**/*.test.{ts,tsx}",
      "client/src/lib/**/*.test.ts",
      "client/src/hooks/**/*.test.ts",
    ],
    // Vitest 4: environmentMatchGlobs → projects[].test.environment.
    // Keeping a single "node" env with jsdom override on the one
    // client-side test file; that matches Vitest 4's recommended path
    // until we migrate to the projects API.
    environment: "node",
    environmentMatchGlobs: [
      ["client/**", "jsdom"],
      ["netlify/**", "node"],
      ["server/**", "node"],
    ],
  },
});
