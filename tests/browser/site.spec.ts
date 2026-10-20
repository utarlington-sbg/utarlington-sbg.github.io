import { test, expect } from '@playwright/test';

const routes = ['/', '/events/', '/blog/', '/grants/'];

for (const width of [1440, 768, 390, 320]) {
  test(`approved pages and footers at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('.header nav')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

      if (route === '/') {
        await expect(page.locator('#home-footer')).toHaveCount(1);
        await expect(page.locator('.hero-actions a')).toHaveCount(1);
        await expect(page.locator('#start .margin-sketch')).toHaveCount(0);
        await expect(page.locator('.home-section')).toHaveCount(3);
        await expect(page.locator('.home-section').first()).toHaveCSS('position', 'relative');
        await expect(page.locator('.home-copy').first()).toHaveCSS('text-align', 'center');
        await expect(page.locator('.margin-sketch')).toHaveCount(4);
        const sketchBounds = await page.locator('.margin-sketch').evaluateAll(sketches => sketches.map(sketch => {
          const section = sketch.closest('.home-section');
          const box = sketch.getBoundingClientRect();
          const sectionBox = section?.getBoundingClientRect();
          return { width: box.width, insideSection: !!sectionBox && box.top >= sectionBox.top && box.bottom <= sectionBox.bottom };
        }));
        for (const sketch of sketchBounds) {
          expect(sketch.width).toBeLessThan(260);
          expect(sketch.insideSection).toBe(true);
        }
        await expect(page.locator('#content img[src*="notebook"]')).toHaveCount(0);
      } else {
        await expect(page.locator('#interior-footer')).toHaveCount(1);
        await expect(page.locator('.footer-placeholder')).toHaveCount(0);
      }

      await expect(page.getByRole('contentinfo').getByRole('link', { name: /^GitHub/ })).toHaveAttribute('href', 'https://github.com/utarlington-sbg');
      await expect(page.getByRole('contentinfo').getByRole('link', { name: /^Discord/ })).toHaveAttribute('href', 'https://discord.gg/cz74RYhEDQ');

      if (route === '/blog/') {
        const box = await page.locator('.journal-cover').boundingBox();
        expect(box).not.toBeNull();
        if (box) expect(Math.abs(box.width - box.height)).toBeLessThan(1);
      }
    }
    expect(runtimeErrors).toEqual([]);
  });
}

test('navigation uses real routes and the article has its own URL', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Blogs', exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await expect(page.locator('.header a[aria-current="page"]')).toHaveText('Blogs');
  await page.getByRole('link', { name: 'Read the sample' }).click();
  await expect(page).toHaveURL(/\/blog\/the-first-useful-version\/$/);
  await expect(page.locator('h1')).toHaveText('The first useful version.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await page.goBack();
  await expect(page.locator('.journal-cover')).toBeVisible();
});

test('navigation hides on downward scroll, returns upward, and is available to keyboards', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(300, 300);
  await page.mouse.wheel(0, 500);
  await expect(page.locator('.header')).toHaveClass(/scroll-hidden/);
  await page.mouse.wheel(0, -160);
  await expect(page.locator('.header')).not.toHaveClass(/scroll-hidden/);
  await page.mouse.wheel(0, 250);
  await expect(page.locator('.header')).toHaveClass(/scroll-hidden/);
  await page.keyboard.press('Tab');
  await expect(page.locator('.header')).not.toHaveClass(/scroll-hidden/);
  await expect(page.locator('.header')).not.toHaveAttribute('inert', '');
});

test('home anchor targets clear the header without numbered navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.chapter-nav, [data-field-toggle]')).toHaveCount(0);
  for (const id of ['gather', 'build', 'read']) {
    await page.locator(`#${id}`).evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    expect(await page.locator(`#${id}`).evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(60);
  }
});

test('page content and navigation still work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Events', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Events');
  await expect(page.locator('.history-row')).toHaveCount(3);
  await context.close();
});

test('unknown pages have a useful error page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'Back home' })).toHaveAttribute('href', '/');
});
