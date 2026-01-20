import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  timeout: 300000,
  use: {
    headless: process.env.CI ? true : false,
  },
});
