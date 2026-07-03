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
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "netlify/functions/__tests__/functions.test.ts",
      "netlify/functions/__tests__/auth-sync-role.test.ts",
      "netlify/functions/__tests__/onboarding-*.test.ts",
      "netlify/functions/__tests__/stripe-*.test.ts",
      "netlify/functions/__tests__/vision-studio.test.ts",
      "netlify/functions/__tests__/lib-*.test.ts",
      "client/src/pages/OnboardingWizard.test.ts",
      "client/src/components/RouteGuards.test.tsx",
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
