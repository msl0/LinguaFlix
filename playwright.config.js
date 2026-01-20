import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  timeout: 300000,
  use: {
    headless: false,
    channel: 'chrome',
    launchOptions: {
      args: [
        `--disable-extensions-except=${path.resolve('./src')}`,
        `--load-extension=${path.resolve('./src')}`,
      ],
    },
  },
});
