import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config (design.md §8): Playwright at 1280×832 (NFR-01 desktop-only
 * shell) against the real dev servers — Next.js proxying `/api/*` to the
 * Django dev server, exactly as prod's nginx does for same-origin cookies
 * (NFR-02/NFR-04).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 832 },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: ".venv/bin/python manage.py runserver 127.0.0.1:8000",
      cwd: "../backend",
      url: "http://127.0.0.1:8000/api/auth/me",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
