import { defineConfig } from "vitest/config";

// Separate from vite.config.ts: unit tests run in Node without the Cloudflare, Start and React
// plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
