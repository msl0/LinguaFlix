import { test, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../playwright/.auth/netflix.json');

test('uruchom przeglądarkę', async () => {
  const extensionPath = path.resolve('./src');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  if (fs.existsSync(authFile)) {
    const storageState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    await context.addCookies(storageState.cookies);
    console.log('✓ Załadowano cookies Netflix');
  } else {
    console.log('! Brak zapisanej sesji - uruchom: npx playwright test auth');
  }

  const page = await context.newPage();
  await page.goto('https://www.netflix.com/browse');
  await page.waitForTimeout(1000000);
});
