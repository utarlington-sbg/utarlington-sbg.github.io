import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { fieldForms, fieldScrollStops } from '../src/lib/open-field.ts';

const directory = path.resolve('docs/verification/open-field');
await mkdir(directory, { recursive: true });
const origin = process.env.FIELD_PREVIEW_URL || 'http://127.0.0.1:4321';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(origin);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-open-field][data-renderer]').waitFor();
  await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode().catch(() => {}))));
  const chapters = await page.locator('.chapter').evaluateAll(elements => elements.map(element => ({ top: element.getBoundingClientRect().top + scrollY, height: element.getBoundingClientRect().height })));
  const offset = await page.locator('[data-header]').evaluate(element => element.getBoundingClientRect().bottom + 16);
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const stops = fieldScrollStops(chapters, offset, maxScroll);
  for (const [index, name] of fieldForms.entries()) {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), stops[index] + 2);
    await page.waitForFunction(name => document.querySelector('[data-open-field]')?.getAttribute('data-field-state') === name, name);
    await page.screenshot({ path: path.join(directory, `${index + 1}-${name}.jpg`), type: 'jpeg', quality: 85 });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(directory, 'home-mobile.jpg'), type: 'jpeg', quality: 85 });
  await page.locator('#gather').evaluate(element => element.scrollIntoView({ behavior: 'instant' }));
  await page.screenshot({ path: path.join(directory, 'gather-mobile.jpg'), type: 'jpeg', quality: 85 });
  await context.close();

  const recording = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    recordVideo: { dir: directory, size: { width: 1024, height: 768 } },
  });
  const live = await recording.newPage();
  const video = live.video();
  await live.goto(origin);
  await live.evaluate(() => document.fonts.ready);
  await live.waitForTimeout(3000);
  for (const id of ['gather', 'build', 'read']) {
    await live.locator(`#${id}`).evaluate(element => element.scrollIntoView({ behavior: 'instant' }));
    await live.waitForTimeout(2600);
  }
  await recording.close();
  if (video) await rename(await video.path(), path.join(directory, 'motion.webm'));
  console.log(`Captured all eight forms, two phone views, and motion.webm in ${directory}`);
} finally {
  await browser.close();
}
