# Cine Pro (Cinestream)

Cross-platform client for the [CinePro](https://cinepro.cc/) ecosystem — browse movies and TV shows via [TMDB](https://www.themoviedb.org/), resolve streams through your self-hosted **CinePro Core** (OMSS API), and play them in a native player. Built with **Expo 54**, **React Native**, and **TypeScript**.

| Platform | Support |
|----------|---------|
| Android (phone & tablet) | Yes |
| Android TV | Yes (drawer navigation, D-pad focus) |
| iOS / iPad | Yes |
| Web | Experimental (`expo start --web`) |

---

## How it works

```
┌─────────────┐     metadata      ┌──────────────┐
│  Cine Pro   │ ────────────────► │  TMDB API    │
│  (this app) │                   └──────────────┘
└──────┬──────┘
       │ stream sources (OMSS)
       ▼
┌──────────────┐
│ CinePro Core │  ← your homelab / LAN URL (http/https)
└──────────────┘
```

1. **TMDB** — posters, titles, genres, search, and show/season metadata.
2. **CinePro Core** — OMSS-compliant backend that scrapes and returns playable sources per title or episode.
3. **This app** — discovery UI, library, and a full-screen player (`react-native-video` with HLS/DASH/SS).

You need a running Core instance and a free TMDB API v3 key. See [CinePro docs](https://docs.cinepro.cc/) for Core setup.

---

## Prerequisites

| Tool | Notes |
|------|--------|
| **Node.js** | 18+ recommended (LTS 20/22 works; repo tested on 22.x) |
| **npm** | Comes with Node |
| **Git** | Clone this repository |

**For native Android builds**

- [Android Studio](https://developer.android.com/studio) with Android SDK (API 34+ typical for RN 0.81)
- JDK 17 (bundled with recent Android Studio)
- `ANDROID_HOME` set, or SDK installed where Gradle can find it

**For native iOS builds** (macOS only)

- Xcode and CocoaPods
- Run `npx expo prebuild` then `npm run ios`

**Optional (development)**

- [Expo Go](https://expo.dev/go) on a device — limited; video and some native modules work best in a **development build** (`expo run:android` / `expo run:ios`).

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/sostk/cinestream.git
cd cinestream
npm install
```

### 2. Generate native projects (first time)

The `android/` and `ios/` folders are not committed (see `.gitignore`). Generate them before native runs or release builds:

```bash
npx expo prebuild
```

Re-run after changing `app.json` plugins or native config.

### 3. Optional developer defaults (`.env`)

Copy the example file for **local-only** fallbacks. End users normally configure everything in the app (onboarding / Settings).

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_TMDB_API_KEY` | TMDB API v3 key (optional dev default) |
| `EXPO_PUBLIC_CINEPRO_BASE_URL` | Core base URL, e.g. `http://localhost:3000` |

On the **Android emulator**, use `http://10.0.2.2:3000` instead of `localhost` to reach a Core server on your host machine.

Restart Metro after changing `.env`.

### 4. Start the dev server

```bash
npm start
```

Then press `a` (Android), `i` (iOS), or `w` (web) in the terminal, or scan the QR code with a dev client.

---

## Build commands

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo / Metro dev server |
| `npm run android` | Debug build and install on device/emulator |
| `npm run android:run:release` | Install release variant on a connected device/emulator |
| `npm run android:release` | **Release APKs for phone + Android TV** → `dist/cinepro-phone-release.apk` and `dist/cinepro-tv-release.apk` |
| `npm run android:release:phone` | Phone release APK only |
| `npm run android:release:tv` | Android TV release APK only |
| `npm run ios` | Debug build on iOS simulator/device (macOS) |
| `npm run web` | Run in the browser |
| `npm run android:apk` | Release APK via Gradle (`android/gradlew.bat assembleRelease`) — requires prebuild first |
| `npm run android:apk:subst` | Phone release APK via SUBST drive (Windows path-length fix) |
| `npm run android:bundle:subst` | Phone release AAB with SUBST drive |
| `npm run android:bundle:release` | Phone + TV release AABs |

### Android release APK (Windows)

Deep paths (e.g. under `Desktop`) can hit Windows’ ~260 character limit during native codegen. The release scripts use a SUBST drive automatically.

**Phone + TV (recommended):**

```powershell
npm run android:release
```

Outputs:

- `dist/cinepro-phone-release.apk`
- `dist/cinepro-tv-release.apk`

**Phone only:**

```powershell
npm run android:apk:subst
```

If drive `R:` is taken:

```powershell
$env:ANDROID_SUBST_DRIVE = 'S'
npm run android:apk:subst
```

Output APK (typical path):

`dist/cinepro-phone-release.apk` (or `dist/cinepro-tv-release.apk` when using `npm run android:release:tv`)

### Android TV builds

This project uses [`react-native-tvos`](https://github.com/react-native-tvos/react-native-tvos) so one dependency supports **both phone and Android TV**. The `@react-native-tvos/config-tv` plugin applies TV manifest changes when `EXPO_TV=1` during prebuild (handled automatically by the release scripts).

For local TV development:

```powershell
$env:EXPO_TV = "1"
npx expo prebuild --clean --platform android
npm run android
```

Unset `EXPO_TV` and prebuild again to return to phone-only native files.

### Android release (macOS / Linux)

```bash
cd android && ./gradlew assembleRelease
```

Or: `npm run android:release` after `npx expo prebuild`.

---

## How to use the app

### First launch — onboarding

1. Open the app after install.
2. Complete the short intro, then enter:
   - **TMDB API v3 key** — create one at [TMDB Settings → API](https://www.themoviedb.org/settings/api) (API key type “Developer”, v3 auth).
   - **CinePro Core URL** — full URL with scheme, e.g. `https://core.example.com` or `http://192.168.1.10:3000`.
3. The app validates the TMDB key against `/configuration` before continuing.

Credentials are stored **on device** (AsyncStorage via Zustand persist), not sent to third parties except TMDB and your Core.

### Main sections

| Tab / drawer | What you can do |
|--------------|-----------------|
| **Home** | Trending and curated rows, hero carousel, genre shortcuts |
| **Search** | Find movies and TV shows |
| **Library** | Watchlist, favorites, continue watching |
| **Settings** | Core URL, TMDB key, Core health check, theme, playback options |

### Watching content

1. Open a **movie** or **TV show** from Home, Search, or Library.
2. For TV, pick **season / episode** in the episode browser.
3. Tap **Play** — the app requests sources from Core (`/v1/movies/{id}` or `/v1/tv/.../episodes/...`).
4. The **player** supports quality selection, playback speed, autoplay next episode, and orientation control.

### Settings worth knowing

- **Core health** — polls `/v1/health` when a URL is saved.
- **Re-run setup** — clears onboarding and walks through TMDB + Core again.
- **Playback** — auto quality, default speed, autoplay next episode, resize/aspect modes (Android).
- **Theme** — light / dark.

### Android TV

On Android TV (`Platform.isTV`), navigation uses a **permanent drawer** instead of bottom tabs, with focus-friendly controls (`FocusSurface`). Pair with a Core URL reachable on your LAN; cleartext HTTP is enabled for local Core (`usesCleartextTraffic`).

---

## Project structure

```
cinestream/
├── index.ts              # App entry (registers src/App)
├── app.json              # Expo config (name: Cine Pro, package: com.cinepro.app)
├── src/
│   ├── App.tsx           # Providers, splash, onboarding gate
│   ├── api/              # TMDB + OMSS (CinePro Core) clients
│   ├── components/       # UI building blocks
│   ├── navigation/       # Stack, tabs (phone), drawer (TV)
│   ├── player/           # Playback, sources, HUD
│   ├── screens/          # Home, Search, Library, Player, etc.
│   ├── store/            # Settings & library persistence
│   └── theme/            # Theming (NativeWind + custom colors)
├── plugins/              # Expo config plugins (e.g. cleartext HTTP)
├── scripts/              # Windows Android release helper
└── assets/               # Icons, splash, logos
```

Path alias: `@/*` → `src/*` (see `tsconfig.json`).

---

## Tech stack

- **Expo SDK 54** · **React Native 0.81** · **React 19**
- **React Navigation** (native stack, bottom tabs, drawer)
- **TanStack Query** — server state / caching
- **Zustand** + **AsyncStorage** — settings & library
- **NativeWind 4** + **Tailwind CSS** — styling
- **react-native-video** — HLS, DASH, Smooth Streaming, RTSP (Android ExoPlayer extensions)

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| “Configure your CinePro Core URL” | Set Core URL in Settings or complete onboarding |
| TMDB errors | Verify v3 API key; check network |
| Core unreachable on emulator | Use `10.0.2.2` instead of `localhost` for host machine |
| Invalid URL `l192.168...` | Remove stray character before IP in Settings |
| Android blocks `http://` Core | Cleartext is enabled in config; ensure URL is correct |
| Windows build path too long | `npm run android:apk:subst` |
| No `android/` folder after clone | `npx expo prebuild` |
| Metro env vars not applied | Stop server, edit `.env`, run `npm start` again |

---

## Related links

- [CinePro](https://cinepro.cc/)
- [Documentation](https://docs.cinepro.cc/)
- [UI showcase](https://ui.cinepro.cc/)
- [cinepro-org on GitHub](https://github.com/cinepro-org)

---

## License

See repository license file if present; otherwise check with the maintainer.
