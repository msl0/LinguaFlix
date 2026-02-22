import { test } from './fixtures.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../../playwright/.auth/netflix.json');

test('launch browser', async ({ context }) => {
  if (fs.existsSync(authFile)) {
    const storageState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    await context.addCookies(storageState.cookies);
    console.log('Loaded Netflix cookies');
  } else {
    console.log('No saved session - run: npx playwright test auth');
  }

  const page = await context.newPage();
  //await page.goto('https://www.netflix.com/browse');

  const firstProfile = page.locator('.profile-icon').first();
  if (await firstProfile.isVisible()) {
    await firstProfile.click();
    console.log('Selected first profile');
  }

  await page.waitForTimeout(1000000);
});
