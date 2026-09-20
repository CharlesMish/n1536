import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

export default defineConfig({
  ...base,
  testMatch: 'routing.spec.js',
  use: { ...base.use, baseURL: 'http://127.0.0.1:8787' },
  webServer: {
    command: 'npx wrangler dev --local --ip 127.0.0.1 --port 8787 --inspector-port 8788',
    url: 'http://127.0.0.1:8787',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: base.projects.filter(project => ['desktop-webgl2', 'narrow-portrait'].includes(project.name)),
});
