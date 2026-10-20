import { defineConfig } from '@playwright/test';

const basePath = process.env.BASE_PATH || '/';
const baseURL = `http://127.0.0.1:4321/${basePath.replace(/^\/+|\/+$/g, '')}`.replace(/\/?$/, '/');

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    // Keep Astro in the foreground so Playwright owns the server lifecycle,
    // including in agent environments where Astro otherwise auto-backgrounds.
    // Invoke Astro directly: the npm preview script already supplies --host,
    // and duplicate host flags discard the explicit IPv4 address.
    command: 'node node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port 4321 --ignore-lock',
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
