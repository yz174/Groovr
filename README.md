# Groovr

A modern music streaming and discovery app built with React Native and Expo. Browse, search, and play music from the JioSaavn library with full offline support, custom playlists, and a polished player experience.

## Features

### Music Playback
- Full audio playback with Play/Pause, Skip Next/Previous controls
- Seek bar with real-time position tracking
- Playback queue with add-to-queue and play-next support
- Repeat modes: None, Repeat All, Repeat One
- Shuffle mode with randomized queue traversal
- OS-level media controls (notification bar, lock screen, hardware buttons)
- Mini player floating above the tab bar when a song is active

### Music Discovery
- Home screen with curated sections: Suggested, Trending Songs, Popular Artists, and Featured Albums
- Full-text search across Songs, Albums, Artists, and Playlists
- Debounced search with tabbed results view
- Artist detail pages with top songs and discography
- Album detail pages with full tracklist and artist chips

### Library Management
- **Favorites** — Toggle and persist liked songs; accessible in a dedicated tab
- **Downloads** — Download songs for offline playback with per-song progress tracking; stored via `expo-file-system`
- **Custom Playlists** — Create, rename, and delete playlists; add and remove individual songs
- **Search History** — Recent searches saved locally (up to 20 entries) with one-tap clear

### Settings & Personalization
- **Theme** — Light, Dark, or System (auto) modes with an orange accent color scheme
- **Audio Quality** — Choose streaming quality: 96 kbps, 160 kbps, or 320 kbps
- **Download Quality** — Independent quality setting for offline downloads
- **Cellular Controls** — Toggle streaming and downloading over mobile data independently
- **Download Management** — View total storage used by downloads; clear all downloads in one tap
- **Custom Typography** — Google Sans font family applied throughout the app

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.83 + Expo 55 |
| Language | TypeScript |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| State Management | Zustand 5 |
| Audio Playback | react-native-track-player |
| Storage | react-native-mmkv + expo-file-system |
| Animations | react-native-reanimated 4 |
| Gestures | react-native-gesture-handler |
| Bottom Sheets | @gorhom/bottom-sheet |
| Icons | @expo/vector-icons (Ionicons) |
| API | JioSaavn (via community REST wrapper) |

## Project Structure

```text
src/
  api/            # JioSaavn API client (search, songs, albums, artists)
  components/     # Reusable UI components (MiniPlayer, SongRow, SongOptionsSheet, ProgressSlider, etc.)
  hooks/          # Shared hooks (useTheme)
  navigation/     # App navigators and route type definitions
  screens/        # All app screens (Home, Search, Favorites, Playlists, Settings, NowPlaying, etc.)
  services/       # PlaybackService — bridges OS media controls to Zustand player store
  store/          # Zustand stores (playerStore, libraryStore, searchStore, settingsStore)
  theme/          # Theme tokens and color helpers
  utils/          # Storage abstraction (MMKV-backed getJSON/setJSON helpers)
```

## Navigation Structure

```
RootStack
├── Main
│   ├── Home Tab → HomeStack (Home → ArtistDetails / AlbumDetails)
│   ├── Search Tab → SearchStack (Search → ArtistDetails / AlbumDetails)
│   ├── Favorites Tab → FavoritesStack (Favorites → ArtistDetails / AlbumDetails)
│   ├── Playlists Tab → PlaylistsStack (Playlists → PlaylistDetails)
│   └── Settings Tab → SettingsStack (Settings)
└── NowPlaying (modal, slide-from-bottom)
```

## State Management

Four Zustand stores handle all app state, each persisted via MMKV:

- **playerStore** — Queue, current index, playback state, shuffle/repeat modes, download progress
- **libraryStore** — Favorites, downloaded songs with metadata, custom playlists
- **searchStore** — Search query, results by category, active tab, recent search history
- **settingsStore** — Theme, audio quality, download quality, cellular preferences

## Prerequisites

- Node.js 18+
- npm 9+
- JDK 17 (required for Android builds)
- Android Studio with Android SDK and a configured emulator or physical device

React Native environment setup: https://reactnative.dev/docs/environment-setup

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start Metro bundler:

```bash
npm start
```

3. Run on Android (in a second terminal):

```bash
npm run android
```

## Useful Scripts

| Script | Description |
|---|---|
| `npm start` | Start the Metro bundler |
| `npm run android` | Build and run on Android device or emulator |

## Troubleshooting

**Metro cache issues:**

```bash
npx react-native start --reset-cache
```

**Android build stuck or stale artifacts:**

```bash
cd android
./gradlew clean
cd ..
npm run android
```

On Windows PowerShell:

```powershell
cd android
.\gradlew.bat clean
cd ..
npm run android
```

## Notes

- Do not commit local secrets in `.env` files.
- Android local SDK configuration lives in `android/local.properties` and should stay untracked.
