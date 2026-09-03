import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";
const webglLaunchOptions = {
  args: [
    "--enable-webgl",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--use-angle=swiftshader",
  ],
};

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "test-results",
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    [process.env.CI ? "line" : "list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    timeout: 10_000,
  },
  webServer: {
    command: "npm run serve:dist",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop-webgl2",
      grep: /@desktop/,
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        launchOptions: webglLaunchOptions,
      },
    },
    {
      name: "desktop-canvas2d",
      grep: /@canvas2d/,
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        launchOptions: webglLaunchOptions,
      },
    },
    {
      name: "mobile-portrait",
      grep: /@mobile/,
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        screen: { width: 390, height: 844 },
        launchOptions: webglLaunchOptions,
      },
    },
    {
      name: "mobile-landscape",
      grep: /@mobile/,
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
        viewport: { width: 844, height: 390 },
        screen: { width: 844, height: 390 },
        launchOptions: webglLaunchOptions,
      },
    },
    {
      name: "compact-landscape",
      grep: /@mobile/,
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
        viewport: { width: 667, height: 375 },
        screen: { width: 667, height: 375 },
        launchOptions: webglLaunchOptions,
      },
    },
    {
      name: "narrow-portrait",
      grep: /@mobile/,
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
        viewport: { width: 320, height: 568 },
        screen: { width: 320, height: 568 },
        launchOptions: webglLaunchOptions,
      },
    },
    {
      name: "narrow-landscape",
      grep: /@mobile/,
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
        viewport: { width: 568, height: 320 },
        screen: { width: 568, height: 320 },
        launchOptions: webglLaunchOptions,
      },
    },
    {
      name: "reduced-motion",
      grep: /@reduced/,
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
        launchOptions: webglLaunchOptions,
      },
    },
  ],
});
