# Rickshaw Brake Fail 🛺

Dhakar rasta, tomar rickshaw — **brake chaplei gorte porba!**

An offline, mobile-friendly three-lane arcade game. The complete browser game (HTML, CSS and JavaScript) is in **`index.html`**. An Android WebView project bundles the same file locally; no Firebase, API keys, accounts, external images, fonts or Internet permission needed.

## Play now

Open `index.html` in a modern browser, or run:

```sh
npm run dev
# http://localhost:3000
```

Python 3 is required for the development server. The game itself requires no dependencies.

- **← / →**, **A / D**, on-screen arrows, or swipe: change lanes.
- Avoid cars, cones and potholes. Speed gradually rises from 20 to 85 km/h.
- **Brake / Space** deliberately ends the run by dropping the rickshaw into a pothole.
- **P / Escape** or the pause button: pause / resume.
- Best score stays on the current browser/device, when local storage is available.
- Sound is optional and off by default. Switching apps pauses the run.

## Android APK bananor niyom

**Shudhu Java file paste korlei APK hoy na.** Manifest, Gradle setup, SDK ar game asset-o lage. Ei repo-te puro project `android/` folder-e ache.

1. Android Studio diye **`android/` folder-ta** project hisebe open koro.
2. Use **JDK 17**, install **Android SDK 35**, and allow Gradle sync. First setup needs Internet to download build dependencies.
3. Choose **Build → Build App Bundle(s) / APK(s) → Build APK(s)**, or run:

   ```sh
   cd android
   ./gradlew assembleDebug
   # Windows: gradlew.bat assembleDebug
   ```

4. Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

For phone IDEs such as AndroidIDE, import the entire `android/` project, not just `MainActivity.java`. Your IDE must support AGP 8.7.3, Gradle 8.9, JDK 17 and SDK 35; older AIDE templates may not work. Minimum Android version: 6.0. Use an up-to-date Android System WebView (Canvas roundRect support is required).

The debug APK is for personal testing. Play Store distribution needs a signed release and the applicable store requirements. **No compiled APK is included, and the native build has not been verified in this sandbox (no JDK/Android SDK).**

### Change the game

Edit the root `index.html`, then sync the bundled Android copy before building:

```sh
npm run sync:android
```

Android entry point: `android/app/src/main/java/com/sojib/rickshaw/MainActivity.java`.

## Browser tests

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

Five tests cover score/speed progression, pause/resume, brake failure, high-score persistence, traffic collision, Android pause events, keyboard input and responsive overflow. For a preinstalled Chromium, set `CHROMIUM_PATH` to its executable. Tests passed in the development sandbox using a registry-distributed Chromium with its bundled libraries; native Android behavior still needs device testing.

## Files

- `index.html` — standalone browser game.
- `android/` — Android project and Gradle wrapper.
- `scripts/sync-android.mjs` — copies the canonical game to Android assets.
- `tests/` — browser tests.

Firebase is intentionally not used for this offline version. A shared leaderboard or sign-in can be added later with proper authentication and database rules.
