# Groovr

A React Native music app with search, playback, playlists, favorites, and theming.

## Tech Stack

- React Native + TypeScript
- Android (Gradle)
- Zustand-style stores in `src/store`
- Screen/navigation structure in `src/screens` and `src/navigation`

## Project Structure

```text
src/
  api/            # API integration (JioSaavn and related clients)
  components/     # Reusable UI components
  hooks/          # Shared React hooks
  navigation/     # App navigation and route typing
  screens/        # App screens
  store/          # App state stores
  theme/          # Theme tokens and helpers
  utils/          # Utility helpers (storage, etc.)
```

## Prerequisites

Install the following before running the app:

- Node.js 18+
- npm 9+
- JDK 17 (for Android builds)
- Android Studio with Android SDK and an emulator

React Native environment setup reference:

- https://reactnative.dev/docs/environment-setup

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start Metro:

```bash
npm start
```

3. Run on Android (in a second terminal):

```bash
npm run android
```

## Useful Scripts

- `npm start` - Start Metro bundler
- `npm run android` - Build and run on Android device/emulator

## Troubleshooting

- If Metro cache causes issues:

```bash
npx react-native start --reset-cache
```

- If Android build gets stuck, clean build artifacts:

```bash
cd android
./gradlew clean
cd ..
npm run android
```

On Windows PowerShell, use:

```powershell
cd android
.\gradlew.bat clean
cd ..
npm run android
```

## Notes

- Do not commit local secrets in `.env` files.
- Android local SDK configuration is stored in `android/local.properties` and should stay untracked.
