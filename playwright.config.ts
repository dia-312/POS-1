import { defineConfig } from "@playwright/test";

const PORT = 5199;

export default defineConfig({
  testDir: "./e2e",
  // every test gets its own browser context, hence its own empty database
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Edge ships with Windows, so no browser download is needed locally.
    channel: process.env.CI ? undefined : "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx vite --mode e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
