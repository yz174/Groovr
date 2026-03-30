import { create } from 'zustand';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Song, getBestDownloadUrl, getSongArtistNames, getBestImage } from '../api/saavn';

export type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  // Queue
  queue: Song[];
  currentIndex: number;

  // Playback state
  isPlaying: boolean;
  isLoading: boolean;
  position: number;      // ms
  duration: number;      // ms

  // Modes
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  shuffledIndices: number[];

  // Offline
  downloadedIds: Set<string>;
  downloadProgress: Record<string, number>;

  // Internal
  sound: Audio.Sound | null;
}

interface PlayerActions {
  // Core
  playQueue: (songs: Song[], startIndex?: number) => Promise<void>;
  playSong: (song: Song) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;

  // Modes
  toggleShuffle: () => void;
  toggleRepeat: () => void;

  // Queue management
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  removeFromQueue: (index: number) => void;

  // Downloads
  setDownloadProgress: (id: string, progress: number) => void;
  markDownloaded: (id: string) => void;
  removeDownload: (id: string) => void;

  // Internal
  _onPlaybackStatusUpdate: (status: AVPlaybackStatus) => void;
  _loadAndPlay: (song: Song) => Promise<void>;
  cleanup: () => Promise<void>;

  // Computed helpers
  currentSong: () => Song | null;
}

type PlayerStore = PlayerState & PlayerActions;

function buildShuffledIndices(length: number, currentIndex: number): number[] {
  const indices = Array.from({ length }, (_, i) => i).filter(i => i !== currentIndex);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return [currentIndex, ...indices];
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  isLoading: false,
  position: 0,
  duration: 0,
  shuffleMode: false,
  repeatMode: 'none',
  shuffledIndices: [],
  downloadedIds: new Set(),
  downloadProgress: {},
  sound: null,

  currentSong: () => {
    const { queue, currentIndex } = get();
    return queue[currentIndex] ?? null;
  },

  playQueue: async (songs, startIndex = 0) => {
    if (!songs.length) return;
    const shuffledIndices = buildShuffledIndices(songs.length, startIndex);
    set({ queue: songs, currentIndex: startIndex, shuffledIndices });
    await get()._loadAndPlay(songs[startIndex]);
  },

  playSong: async (song) => {
    const { queue } = get();
    const existingIdx = queue.findIndex(s => s.id === song.id);
    if (existingIdx >= 0) {
      set({ currentIndex: existingIdx });
      await get()._loadAndPlay(song);
    } else {
      set({ queue: [song], currentIndex: 0, shuffledIndices: [0] });
      await get()._loadAndPlay(song);
    }
  },

  _loadAndPlay: async (song) => {
    const { sound: prevSound } = get();
    set({ isLoading: true, position: 0, duration: 0 });

    try {
      // Unload previous
      if (prevSound) {
        await prevSound.unloadAsync().catch(() => {});
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const url = getBestDownloadUrl(song.downloadUrl, '320kbps');
      if (!url) throw new Error('No download URL');

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        get()._onPlaybackStatusUpdate
      );

      set({ sound, isLoading: false, isPlaying: true });
    } catch (err) {
      console.error('Failed to load song:', err);
      set({ isLoading: false, isPlaying: false });
    }
  },

  _onPlaybackStatusUpdate: (status) => {
    if (!status.isLoaded) return;
    set({
      isPlaying: status.isPlaying,
      position: status.positionMillis,
      duration: status.durationMillis ?? 0,
    });

    // Auto-advance when finished
    if (status.didJustFinish) {
      const { repeatMode } = get();
      if (repeatMode === 'one') {
        get().seekTo(0).then(() => get().resume());
      } else {
        get().skipNext();
      }
    }
  },

  pause: async () => {
    const { sound } = get();
    if (sound) await sound.pauseAsync().catch(() => {});
    set({ isPlaying: false });
  },

  resume: async () => {
    const { sound } = get();
    if (sound) await sound.playAsync().catch(() => {});
    set({ isPlaying: true });
  },

  togglePlay: async () => {
    const { isPlaying } = get();
    if (isPlaying) await get().pause();
    else await get().resume();
  },

  seekTo: async (positionMs) => {
    const { sound } = get();
    if (sound) {
      await sound.setPositionAsync(positionMs).catch(() => {});
      set({ position: positionMs });
    }
  },

  skipNext: async () => {
    const { queue, currentIndex, shuffleMode, shuffledIndices, repeatMode } = get();
    if (!queue.length) return;

    let nextIndex: number;
    if (shuffleMode && shuffledIndices.length > 1) {
      const shuffledPos = shuffledIndices.indexOf(currentIndex);
      const nextShuffledPos = (shuffledPos + 1) % shuffledIndices.length;
      nextIndex = shuffledIndices[nextShuffledPos];
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') nextIndex = 0;
        else return; // End of queue
      }
    }
    set({ currentIndex: nextIndex });
    await get()._loadAndPlay(queue[nextIndex]);
  },

  skipPrevious: async () => {
    const { queue, currentIndex, position, shuffleMode, shuffledIndices } = get();
    if (!queue.length) return;

    // If > 3 seconds in, restart current
    if (position > 3000) {
      await get().seekTo(0);
      return;
    }

    let prevIndex: number;
    if (shuffleMode && shuffledIndices.length > 1) {
      const shuffledPos = shuffledIndices.indexOf(currentIndex);
      const prevShuffledPos = (shuffledPos - 1 + shuffledIndices.length) % shuffledIndices.length;
      prevIndex = shuffledIndices[prevShuffledPos];
    } else {
      prevIndex = Math.max(0, currentIndex - 1);
    }
    set({ currentIndex: prevIndex });
    await get()._loadAndPlay(queue[prevIndex]);
  },

  toggleShuffle: () => {
    const { shuffleMode, queue, currentIndex } = get();
    const newMode = !shuffleMode;
    const newIndices = newMode ? buildShuffledIndices(queue.length, currentIndex) : [];
    set({ shuffleMode: newMode, shuffledIndices: newIndices });
  },

  toggleRepeat: () => {
    const { repeatMode } = get();
    const next: RepeatMode = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
    set({ repeatMode: next });
  },

  addToQueue: (song) => {
    set(state => ({ queue: [...state.queue, song] }));
  },

  playNext: (song) => {
    set(state => {
      const newQueue = [...state.queue];
      newQueue.splice(state.currentIndex + 1, 0, song);
      return { queue: newQueue };
    });
  },

  removeFromQueue: (index) => {
    set(state => {
      const newQueue = state.queue.filter((_, i) => i !== index);
      const newIndex = index < state.currentIndex
        ? state.currentIndex - 1
        : Math.min(state.currentIndex, newQueue.length - 1);
      return { queue: newQueue, currentIndex: Math.max(0, newIndex) };
    });
  },

  setDownloadProgress: (id, progress) => {
    set(state => ({ downloadProgress: { ...state.downloadProgress, [id]: progress } }));
  },

  markDownloaded: (id) => {
    set(state => {
      const next = new Set(state.downloadedIds);
      next.add(id);
      const { [id]: _, ...restProgress } = state.downloadProgress;
      return { downloadedIds: next, downloadProgress: restProgress };
    });
  },

  removeDownload: (id) => {
    set(state => {
      const next = new Set(state.downloadedIds);
      next.delete(id);
      return { downloadedIds: next };
    });
  },

  cleanup: async () => {
    const { sound } = get();
    if (sound) await sound.unloadAsync().catch(() => {});
    set({ sound: null, isPlaying: false });
  },
}));
