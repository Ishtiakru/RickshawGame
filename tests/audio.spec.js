const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');

const clip = name => `audio[data-sound="${name}"]`;
const playing = (page, name) => page.locator(clip(name)).evaluate(a => !a.paused && !a.muted && a.readyState >= 2);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto('/');
});

test('embedded WAV clips are real, non-silent PCM and match Android resources', async ({ page }) => {
  for (const name of ['ride', 'start', 'steer', 'crash', 'test']) {
    const source = readFileSync(`audio/${name}.wav`);
    expect(source.equals(readFileSync(`android/app/src/main/res/raw/${name}.wav`))).toBe(true);
    expect(source.toString('ascii', 0, 4)).toBe('RIFF');
    const embedded = await page.locator(clip(name)).getAttribute('src');
    expect(Buffer.from(embedded.split(',')[1], 'base64').equals(source)).toBe(true);
    // Generated files use a standard 44-byte PCM header.
    let power = 0;
    for (let i = 44; i < source.length; i += 2) power += (source.readInt16LE(i) / 32768) ** 2;
    expect(Math.sqrt(power / ((source.length - 44) / 2))).toBeGreaterThan(.1);
  }
});

test('Play starts continuous WAV playback, mute persists and can restore', async ({ page }) => {
  await page.locator('#play').click();
  await expect(page.locator('#sound')).toHaveText('SOUND ON ♫');
  await expect.poll(() => playing(page, 'ride')).toBe(true);
  const first = await page.locator(clip('ride')).evaluate(a => a.currentTime);
  await page.waitForTimeout(300);
  expect(await page.locator(clip('ride')).evaluate(a => a.currentTime)).not.toBe(first);
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveText('SOUND OFF ♩');
  await expect.poll(() => playing(page, 'ride')).toBe(false);
  await page.reload();
  await expect(page.locator('#sound')).toHaveText('SOUND OFF ♩');
  await page.locator('#play').click();
  expect(await playing(page, 'ride')).toBe(false);
  await page.locator('#sound').click();
  await expect.poll(() => playing(page, 'ride')).toBe(true);
});

test('pause, native lifecycle and game over stop ride audio', async ({ page }) => {
  await page.locator('#play').click();
  await expect.poll(() => playing(page, 'ride')).toBe(true);
  await page.locator('#pause').click();
  await expect.poll(() => playing(page, 'ride')).toBe(false);
  await page.locator('#play').click();
  await expect.poll(() => playing(page, 'ride')).toBe(true);
  await page.evaluate(() => document.dispatchEvent(new Event('rickshaw-pause')));
  await expect.poll(() => playing(page, 'ride')).toBe(false);
  await page.evaluate(() => document.dispatchEvent(new Event('rickshaw-resume')));
  await expect(page.locator('#play')).toHaveText('CONTINUE RIDE ↗');
  await page.locator('#play').click();
  await expect.poll(() => playing(page, 'ride')).toBe(true);
  await page.locator('#brake').click();
  await expect.poll(() => playing(page, 'ride')).toBe(false);
  expect(await page.locator('audio').count()).toBe(5);
});

test('TEST SOUND works before Play and while muted, without starting the game', async ({ page }) => {
  await page.locator('#test-sound').click();
  await expect(page.locator('#sound')).toHaveText('SOUND ON ♫');
  await expect.poll(() => playing(page, 'test')).toBe(true);
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#score')).toHaveText('0000');
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveText('SOUND OFF ♩');
  await page.locator('#test-sound').click();
  await expect.poll(() => playing(page, 'test')).toBe(true);
});

test('works without Web Audio and without external audio downloads', async ({ page }) => {
  await page.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  await page.reload();
  await page.locator('#play').click();
  await expect.poll(() => playing(page, 'ride')).toBe(true);
  await expect(page.locator('#audio-status')).toContainText('Browser WAV');
  await expect(page.locator('#audio-status')).toContainText('v1.2.0');
});

test('denied media playback reports failure and can be retried', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    window.__denyAudio = true;
    HTMLMediaElement.prototype.play = function () {
      if (window.__denyAudio) return Promise.reject(new DOMException('Playback blocked for test', 'NotAllowedError'));
      return play.call(this);
    };
  });
  await page.reload();
  await page.locator('#test-sound').click();
  await expect(page.locator('#sound')).toHaveText('TAP FOR SOUND ♫');
  await expect(page.locator('#audio-status')).toContainText('NotAllowedError');
  await page.evaluate(() => { window.__denyAudio = false; });
  await page.locator('#test-sound').click();
  await expect(page.locator('#sound')).toHaveText('SOUND ON ♫');
});

test('native backend reports zero media volume and handles focus interruption', async ({ page }) => {
  await page.addInitScript(() => {
    const s = { ready: true, focused: false, playing: false, volume: 0, maxVolume: 15 };
    window.__native = s;
    window.__effects = [];
    window.RickshawAudio = {
      configure(enabled, running) { s.focused = enabled; s.playing = enabled && running; },
      status() { return JSON.stringify(s); },
      effect(kind) { window.__effects.push(kind); },
      stopEffects() {}
    };
  });
  await page.reload();
  expect(await page.locator('audio').count()).toBe(0);
  await page.locator('#test-sound').click();
  await expect(page.locator('#sound')).toHaveText('MEDIA VOLUME 0');
  await expect(page.locator('#audio-status')).toContainText('Android native · media volume 0/15');
  await page.evaluate(() => { window.__native.volume = 9; });
  await page.locator('#play').click();
  await expect(page.locator('#sound')).toHaveText('SOUND ON ♫');
  await expect.poll(() => page.evaluate(() => window.__native.playing)).toBe(true);
  await page.evaluate(() => document.dispatchEvent(new Event('rickshaw-audio-interrupted')));
  await expect(page.locator('#play')).toHaveText('CONTINUE RIDE ↗');
  await expect.poll(() => page.evaluate(() => window.__native.playing)).toBe(false);
  await page.locator('#play').click();
  await expect.poll(() => page.evaluate(() => window.__native.playing)).toBe(true);
});
