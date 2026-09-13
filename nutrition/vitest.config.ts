import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  // @testing-library/react + jsdom were already dependencies but nothing
  // was wired up to use them: the include pattern only matched `.test.ts`
  // and the environment was always `node`. Component tests (`.test.tsx`)
  // now run too; each one opts into jsdom with a
  // `// @vitest-environment jsdom` docblock, so the pure calculation
  // tests in src/lib/nutrition keep running in plain node as before.
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
