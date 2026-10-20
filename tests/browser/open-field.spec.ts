import { test, expect } from '@playwright/test';
import { fieldForms, fieldScrollStops } from '../../src/lib/open-field';

test('particles move automatically without visible motion controls', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  const field = page.locator('[data-open-field]');
  const canvas = field.locator('canvas');
  await expect(field).toHaveAttribute('data-renderer', /webgl|canvas2d/);
  await page.mouse.move(20, 20);
  const first = await canvas.screenshot();
  await page.waitForTimeout(650);
  expect((await canvas.screenshot()).equals(first)).toBe(false);
  await expect(page.locator('[data-field-toggle], .field-motion-toggle, .chapter-nav')).toHaveCount(0);
});

test('all eight scroll states produce distinct particle geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-open-field]')).toHaveAttribute('data-motion', 'reduced');
  // Remove foreground differences so the comparison measures the particle field.
  await page.addStyleTag({ content: '.header,.hero-center,.home-copy,.margin-sketch,footer{visibility:hidden!important}' });
  const layout = await page.locator('.chapter').evaluateAll(els => els.map(el => ({ top: el.getBoundingClientRect().top + scrollY, height: el.getBoundingClientRect().height })));
  const offset = await page.locator('[data-header]').evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.top + rect.height + 16;
  });
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const stops = fieldScrollStops(layout, offset, maxScroll);
  const frames: Buffer[] = [];
  for (const [index, name] of fieldForms.entries()) {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), stops[index] + 2);
    await expect(page.locator('[data-open-field]')).toHaveAttribute('data-field-state', name);
    const frame = await page.locator('[data-open-field] canvas').screenshot();
    expect(frames.some(previous => previous.equals(frame))).toBe(false);
    frames.push(frame);
  }
});

test('reduced motion stays still and follows system preference changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  const canvas = page.locator('[data-open-field] canvas');
  await expect(page.locator('[data-open-field]')).toHaveAttribute('data-motion', 'reduced');
  const first = await canvas.screenshot();
  await page.waitForTimeout(650);
  expect((await canvas.screenshot()).equals(first)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(20, 20);
  await page.waitForTimeout(650);
  expect((await canvas.screenshot()).equals(first)).toBe(false);
});

test('the final ripple form remains visible above the normal footer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight - innerHeight, behavior: 'instant' }));
  await expect(page.locator('[data-open-field]')).toHaveAttribute('data-field-state', 'echo');
  await expect(page.locator('#home-footer')).toBeVisible();
  const clip = { x: 450, y: 80, width: 540, height: 180 };
  const visible = await page.screenshot({ clip });
  await page.locator('[data-open-field]').evaluate(element => element.style.visibility = 'hidden');
  const hidden = await page.screenshot({ clip });
  expect(visible.equals(hidden)).toBe(false);
});

test('the background still moves when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, type: string, options?: object) {
        return type.startsWith('webgl') ? null : Reflect.apply(original, this, [type, options]);
      },
    });
  });
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-open-field]')).toHaveAttribute('data-renderer', 'canvas2d');
  const canvas = page.locator('[data-open-field] canvas');
  const first = await canvas.screenshot();
  await page.waitForTimeout(650);
  expect((await canvas.screenshot()).equals(first)).toBe(false);
});

test('losing a graphics context recovers with a moving 2D field', async ({ page }) => {
  await page.goto('./');
  const field = page.locator('[data-open-field]');
  await expect(field).toHaveAttribute('data-renderer', 'webgl');
  await field.locator('canvas').evaluate(canvas => {
    if (canvas instanceof HTMLCanvasElement) canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await expect(field).toHaveAttribute('data-renderer', 'canvas2d');
  const first = await field.locator('canvas').screenshot();
  await page.waitForTimeout(650);
  expect((await field.locator('canvas').screenshot()).equals(first)).toBe(false);
});
