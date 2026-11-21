const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  // All obstacles spawn in the left lane, making timing tests reproducible.
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto('/');
});

test('starts, scores, accelerates and pauses', async ({ page }) => {
  await page.locator('#play').click();
  await expect(page.locator('#overlay')).toBeHidden();
  await page.clock.runFor(4000);
  expect(Number(await page.locator('#score').textContent())).toBeGreaterThan(0);
  expect(Number(await page.locator('#speed').textContent())).toBeGreaterThan(20);
  await page.locator('#pause').click();
  const score = await page.locator('#score').textContent();
  await page.clock.runFor(2000);
  await expect(page.locator('#score')).toHaveText(score);
  await page.locator('#play').click();
  await expect(page.locator('#overlay')).toBeHidden();
});

test('braking ends the ride, saves best and restarts cleanly', async ({ page }) => {
  await page.locator('#play').click();
  await page.clock.runFor(2000);
  await page.locator('#brake').click();
  await expect(page.locator('#title')).toContainText('Gorte porla!');
  const best = await page.locator('#best').textContent();
  expect(Number(best)).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('#best')).toHaveText(best);
  await page.locator('#play').click();
  await expect(page.locator('#score')).toHaveText('0000');
});

test('steering into traffic causes collision', async ({ page }) => {
  await page.locator('#play').click();
  await page.locator('#left').dispatchEvent('pointerdown');
  await page.clock.runFor(5000);
  await expect(page.locator('#title')).toContainText('Dhakka');
});

test('keyboard and Android lifecycle pause work', async ({ page }) => {
  await page.locator('#play').click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('p');
  await expect(page.locator('#overlay')).toBeVisible();
  await page.locator('#play').click();
  await page.evaluate(() => document.dispatchEvent(new Event('rickshaw-pause')));
  await expect(page.locator('#play')).toHaveText('CONTINUE RIDE ↗');
});

test('fits phone and desktop without script errors or horizontal overflow', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const viewport of [{width: 320, height: 640}, {width: 1440, height: 1000}]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.locator('#play')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
