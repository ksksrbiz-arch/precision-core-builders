import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "netlify/functions/__tests__/onboarding-*.test.ts",
      "client/src/pages/OnboardingWizard.test.ts",
    ],
    environmentMatchGlobs: [
      ["client/**", "jsdom"],
      ["netlify/**", "node"],
      ["server/**", "node"],
    ],
  },
});
