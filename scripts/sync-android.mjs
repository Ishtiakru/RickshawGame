import './sync-audio.mjs';
import { copyFileSync } from 'node:fs';
copyFileSync(new URL('../index.html', import.meta.url), new URL('../android/app/src/main/assets/index.html', import.meta.url));
console.log('Android game asset updated.');
