import { test, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../../playwright/.auth/netflix.json');

test('authenticate to netflix', async () => {
  const extensionPath = path.resolve('./src');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = await context.newPage();
  await page.goto('https://www.netflix.com/login');

  console.log('Log in manually to Netflix...');
  console.log('After logging in, navigate to the home page (https://www.netflix.com/browse)');
  console.log('Test will automatically save the session when you are on /browse');

  await page.waitForURL('**/browse**', { timeout: 300000 });

  await page.context().storageState({ path: authFile });
  console.log(`Session saved to: ${authFile}`);

  await context.close();
});
