import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'groovr-storage' });

// ─── Typed helpers ─────────────────────────────────────────────────────────

export function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getString(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

// ─── Keys ──────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  RECENT_SEARCHES: 'recent_searches',
  FAVORITES: 'favorites',
  DOWNLOADS: 'downloads',
  THEME: 'theme',
  AUDIO_QUALITY: 'audio_quality',
  PLAYLISTS: 'playlists',
  LAST_PLAYED: 'last_played',
  RECENT_SONGS: 'recent_songs',
} as const;
