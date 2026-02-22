import { test as base, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const test = base.extend({
  context: async ({ headless }, use) => {
    const extensionPath = path.resolve('./src');

    const context = await chromium.launchPersistentContext('C:\\Users\\mslow\\AppData\\Local\\Google\\Chrome for Testing', {
      headless,
      ignoreDefaultArgs: ['--disable-component-update'],
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        `--enable-widevine`,
        `--no-sandbox`,
      ],
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
