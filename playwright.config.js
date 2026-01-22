import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 300000,
  use: {
    headless: process.env.CI ? true : false,
  }
});
