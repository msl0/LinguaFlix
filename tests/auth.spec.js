import { test, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../playwright/.auth/netflix.json');

test('authenticate to netflix', async () => {
  const extensionPath = path.resolve('./src');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = await context.newPage();
  await page.goto('https://www.netflix.com/login');

  console.log('Zaloguj się ręcznie do Netflixa...');
  console.log('Po zalogowaniu przejdź na stronę główną (https://www.netflix.com/browse)');
  console.log('Test automatycznie zapisze sesję gdy będziesz na /browse');

  await page.waitForURL('**/browse**', { timeout: 300000 });

  await page.context().storageState({ path: authFile });
  console.log(`Sesja zapisana do: ${authFile}`);

  await context.close();
});
