import { test, expect } from '@playwright/test';

async function scrollToFooter(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
}

test('the Home photo is dithered and keeps drifting', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await scrollToFooter(page);
  const art = page.locator('#home-footer .footer-photo');
  await expect(art).toHaveAttribute('data-renderer', 'webgl');
  await expect(art.locator('img')).toHaveAttribute('alt', /purple Cloud Clubs shirts/);
  const canvas = art.locator('canvas');
  const first = await canvas.screenshot();
  await page.waitForTimeout(1200);
  expect((await canvas.screenshot()).equals(first)).toBe(false);
});

test('reduced motion holds the dithered photo still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await scrollToFooter(page);
  const art = page.locator('#home-footer .footer-photo');
  await expect(art).toHaveAttribute('data-renderer', 'webgl');
  await expect(art).toHaveAttribute('data-motion', 'reduced');
  const canvas = art.locator('canvas');
  const first = await canvas.screenshot();
  await page.waitForTimeout(800);
  expect((await canvas.screenshot()).equals(first)).toBe(true);
});

test('the plain photo stays visible without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, type: string, options?: object) {
        return type.startsWith('webgl') && this.closest('.footer-photo') ? null : Reflect.apply(original, this, [type, options]);
      },
    });
  });
  await scrollToFooter(page);
  const art = page.locator('#home-footer .footer-photo');
  await expect(art.locator('img')).toBeVisible();
  await expect(art).not.toHaveAttribute('data-renderer');
  await expect(art.locator('canvas')).toBeHidden();
});
