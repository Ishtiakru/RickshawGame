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
- Sound uses Android **MediaPlayer + SoundPool** in the APK, and embedded **PCM WAV media** in the browser (not Web Audio oscillators). It is enabled on the first Play tap by default: a continuous ride tone plus steering and crash effects. The sound button mutes/unmutes and remembers your choice. Turn up **media volume**, not ringtone volume. If the browser blocks audio, tap **TAP FOR SOUND** to retry. Switching apps pauses the run and silences audio.

## Sound troubleshooting (v1.2.0)

The previous Web Audio build could show SOUND ON without audible output on some phones. Version **1.2.0** replaces that playback path and shows a **SOUND HELP** panel:

1. Confirm **v1.2.0** is visible. The Pages website stays on the older version until this PR is merged into `main` and Pages redeploys; installing the new APK does not update the browser page.
2. Tap **TEST SOUND** for a midrange, three-pulse horn. The button works before starting a ride and re-enables a saved mute preference.
3. In the APK, diagnostics identify **Android native**, show the system media-volume level and report focus/playback errors. The label **MEDIA VOLUME 0** means turn up media volume using the phone buttons.
4. In the browser, diagnostics identify **Browser WAV**, show playback progress, and report a rejected `.play()` instead of relying on an AudioContext state. Check Chrome → Site settings → Sound is allowed.
5. Disconnect Bluetooth/headphones if sound is routed elsewhere. The game never forces a speaker route or raises system volume automatically.
6. If still silent, send a screenshot of the expanded SOUND HELP panel and your phone model/Android version. A successful software playback test cannot prove sound is reaching your physical speaker.

Original PCM clips live in `audio/`. Regenerate with `python3 scripts/generate-sounds.py`; `npm run sync:android` embeds the clips into standalone HTML and copies them to Android raw resources. The native bridge exposes only bounded sound controls/status, and exists only in a bundled, navigation-blocked WebView with restrictive CSP and no Internet permission. Audio stops directly in the Activity lifecycle, even if JavaScript timers are paused.

## Android APK download

Open [GitHub Releases](https://github.com/Ishtiakru/RickshawGame/releases) and choose the **Android test APK** release. Under **Assets**, download **`Rickshaw-Brake-Fail-v1.2.0.apk`**, not the source-code ZIP. If the release is not there yet, check the [Android APK workflow](https://github.com/Ishtiakru/RickshawGame/actions/workflows/android-apk.yml).

On your Android phone, open the APK and allow **Install unknown apps** for your browser/file manager only if you trust this build. Install, then open **Rickshaw Brake Fail** and tap Play. Disable that install permission afterwards if desired. The installed game works offline; turn up media volume for audio. It requires an up-to-date **Android System WebView**.

This is a debug-signed personal-test build, not a Play Store production release. CI caches its debug signing key; if the cache expires, you may need to uninstall an older test APK before installing the new one (this removes your saved best score). The workflow verifies the APK signature and package and publishes a SHA-256 checksum. Physical-device playback still needs a phone test.

### Automated APK build

`.github/workflows/android-apk.yml` runs on pushes to `main` and `arena/**` and can also be run manually. It runs browser/audio tests, verifies asset sync, installs JDK 17 / Android SDK 35, builds and lints the app, runs a native-audio/lifecycle emulator smoke test, verifies the debug signature, and uploads an APK artifact plus a prerelease download. It needs Actions enabled and workflow `contents: write` permission to publish the release. APK binaries/build dependencies are not committed to Git.

## Android APK nijey build korar niyom

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

The debug APK is for personal testing. Play Store distribution needs a signed release and the applicable store requirements. The sandbox has no JDK/Android SDK; the GitHub Actions build is the source of truth for native build/lint results. Compiled APKs are distributed through Releases / Actions, not the source tree.

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

Tests cover score/speed progression, pause/resume, brake failure, high-score persistence, traffic collision, Android lifecycle events, keyboard input and responsive overflow. Audio tests check embedded WAV sample energy and Android asset parity, real HTML media playback/progress, mute persistence, pause/background silence, rejected-play retry, zero-volume diagnostics and native bridge/focus routing. No production Web Audio API is required. For a preinstalled Chromium, set `CHROMIUM_PATH` to its executable. Tests passed in the development sandbox using a registry-distributed Chromium with its bundled libraries; native behavior is also exercised by the Android emulator smoke test; physical speaker audibility still needs a real-phone check.

## Files

- `index.html` — standalone browser game.
- `android/` — Android project and Gradle wrapper.
- `audio/` — original generated PCM WAV clips.
- `scripts/sync-android.mjs` — embeds audio and synchronizes HTML/raw Android resources.
- `android/app/src/androidTest/` — emulator audio/bridge/lifecycle smoke test.
- `tests/` — browser tests.

Firebase is intentionally not used for this offline version. A shared leaderboard or sign-in can be added later with proper authentication and database rules.
