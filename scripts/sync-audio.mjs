import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const names = ['ride', 'start', 'steer', 'crash', 'test'];
const data = {};
mkdirSync(new URL('android/app/src/main/res/raw/', root), { recursive: true });
for (const name of names) {
  const source = new URL(`audio/${name}.wav`, root);
  data[name] = `data:audio/wav;base64,${readFileSync(source).toString('base64')}`;
  copyFileSync(source, new URL(`android/app/src/main/res/raw/${name}.wav`, root));
}
const html = new URL('index.html', root);
const text = readFileSync(html, 'utf8');
const marker = /\/\/ AUDIO_DATA_START\n[\s\S]*?\/\/ AUDIO_DATA_END/;
if (!marker.test(text)) throw new Error('Audio embedding markers missing');
writeFileSync(html, text.replace(marker, `// AUDIO_DATA_START\nconst AUDIO_DATA = ${JSON.stringify(data)};\n// AUDIO_DATA_END`));
console.log('Embedded PCM audio and Android raw clips synchronized.');
