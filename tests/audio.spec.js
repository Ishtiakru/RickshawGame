const { test, expect } = require('@playwright/test');

// Capture real audio nodes, not a game-only test hook. Validate an actual audio signal.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext || window.webkitAudioContext;
    window.__contexts = [];
    window.AudioContext = class extends NativeAudio {
      constructor(...args) {
        super(...args);
        this.gains = [];
        this.motors = [];
        window.__contexts.push(this);
      }
      createGain() { const g = super.createGain(); this.gains.push(g); return g; }
      createOscillator() { const o = super.createOscillator(); this.motors.push(o); return o; }
    };
    Math.random = () => 0;
  });
  await page.goto('/');
});

async function signal(page) {
  return page.evaluate(() => {
    const a = window.__contexts[0];
    if (!a?.analyser) return 0;
    const samples = new Float32Array(a.analyser.fftSize);
    a.analyser.getFloatTimeDomainData(samples);
    return Math.sqrt(samples.reduce((total, value) => total + value * value, 0) / samples.length);
  });
}

async function listen(page) {
  await page.evaluate(() => {
    const a = window.__contexts[0];
    a.analyser = a.createAnalyser();
    a.gains[0].connect(a.analyser);
  });
}

test('Play unlocks audible continuous sound; mute persists and restores', async ({ page }) => {
  await page.locator('#play').click();
  await expect(page.locator('#sound')).toHaveText('SOUND ON ♫');
  await listen(page);
  await expect.poll(() => signal(page)).toBeGreaterThan(.01);
  // Wait past the start effect: the engine must still generate audio.
  await page.waitForTimeout(600);
  expect(await signal(page)).toBeGreaterThan(.01);
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveText('SOUND OFF ♩');
  await expect.poll(() => signal(page)).toBeLessThan(.0001);
  await page.reload();
  await expect(page.locator('#sound')).toHaveText('SOUND OFF ♩');
  await page.locator('#play').click();
  expect(await page.evaluate(() => window.__contexts.length)).toBe(0);
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveText('SOUND ON ♫');
  await listen(page);
  await expect.poll(() => signal(page)).toBeGreaterThan(.01);
});

test('pause, game over and native background silence audio without duplicating engines', async ({ page }) => {
  await page.locator('#play').click();
  await listen(page);
  await page.locator('#pause').click();
  await expect.poll(() => signal(page)).toBeLessThan(.0001);
  await page.locator('#play').click();
  await expect.poll(() => signal(page)).toBeGreaterThan(.01);
  await page.locator('#brake').click();
  await expect.poll(() => signal(page)).toBeLessThan(.0001);
  await page.locator('#play').click();
  await page.evaluate(() => document.dispatchEvent(new Event('rickshaw-pause')));
  await expect.poll(() => signal(page)).toBeLessThan(.0001);
  await page.evaluate(() => document.dispatchEvent(new Event('rickshaw-resume')));
  await expect(page.locator('#play')).toHaveText('CONTINUE RIDE ↗');
  await page.locator('#play').click();
  await expect.poll(() => signal(page)).toBeGreaterThan(.01);
  expect(await page.evaluate(() => window.__contexts.length)).toBe(1);
  // Two continuous oscillators only. Effects are stopped/disconnected after their envelope.
  expect(await page.evaluate(() => window.__contexts[0].motors.length)).toBeLessThan(10);
});

test('sound enable before Play gives audible feedback without starting the game', async ({ page }) => {
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#score')).toHaveText('0000');
  expect(await page.evaluate(() => window.__contexts[0].motors.length)).toBe(3);
});

test('suspended AudioContext is resumed on next user tap', async ({ page }) => {
  await page.locator('#play').click();
  await page.evaluate(() => window.__contexts[0].suspend());
  await expect(page.locator('#sound')).toHaveText('TAP FOR SOUND ♫');
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveText('SOUND ON ♫');
  await listen(page);
  await expect.poll(() => signal(page)).toBeGreaterThan(.01);
});

test('missing audio API does not break the game or falsely report sound on', async ({ page }) => {
  await page.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  await page.reload();
  await page.locator('#play').click();
  await expect(page.locator('#sound')).toHaveText('AUDIO UNAVAILABLE');
  await expect(page.locator('#overlay')).toBeHidden();
  await page.locator('#brake').click();
  await expect(page.locator('#title')).toContainText('Gorte porla!');
});
