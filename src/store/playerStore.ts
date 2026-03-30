import { create } from 'zustand';
import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
  Event,
  State,
} from 'react-native-track-player';
import { Song, getBestDownloadUrl, getSongArtistNames, getBestImage } from '../api/saavn';

export type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  // Queue
  queue: Song[];
  currentIndex: number;

  // Playback state
  isPlaying: boolean;
  isLoading: boolean;
  position: number;   // ms
  duration: number;   // ms

  // Modes
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  shuffledIndices: number[];

  // Offline
  downloadedIds: Set<string>;
  downloadProgress: Record<string, number>;

  // UI overlays
  isBlockingOverlayVisible: boolean;
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
  setBlockingOverlayVisible: (visible: boolean) => void;

  // Internal
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

let _playerReady = false;

async function ensurePlayerReady() {
  if (_playerReady) return;
  _playerReady = true;
  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
    await TrackPlayer.updateOptions({
      progressUpdateEventInterval: 0.5,
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
    });
  } catch {
    // setupPlayer throws if called more than once; treat as already ready
  }
}

function songToTrack(song: Song) {
  return {
    id: song.id,
    url: getBestDownloadUrl(song.downloadUrl, '320kbps') ?? '',
    title: song.name,
    artist: getSongArtistNames(song),
    artwork: getBestImage(song.image, '500x500') ?? undefined,
  };
}

export const usePlayerStore = create<PlayerStore>((set, get) => {
  // Subscribe to RNTP events at store creation time (closure captures set/get)
  TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
    set({
      isPlaying: e.state === State.Playing,
      isLoading: e.state === State.Loading || e.state === State.Buffering,
    });
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
    set({
      position: Math.floor(e.position * 1000),
      duration: Math.floor(e.duration * 1000),
    });
  });

  // Fires when the current track finishes and there's nothing left in the RNTP queue.
  // Since we only ever load one track at a time, this fires on every natural track end.
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    const { repeatMode } = get();
    if (repeatMode === 'one') {
      await TrackPlayer.seekTo(0);
      await TrackPlayer.play();
    } else {
      await get().skipNext();
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
    console.error('Playback error:', e);
    set({ isLoading: false, isPlaying: false });
  });

  return {
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
    isBlockingOverlayVisible: false,

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
      set({ isLoading: true, position: 0, duration: 0 });
      try {
        await ensurePlayerReady();
        // Keep only this track in the RNTP queue so PlaybackQueueEnded fires
        // reliably on natural track end (used for auto-advance + repeat logic).
        await TrackPlayer.reset();
        await TrackPlayer.add(songToTrack(song));
        await TrackPlayer.play();
        set({ isLoading: false });
      } catch (err) {
        console.error('Failed to load song:', err);
        set({ isLoading: false, isPlaying: false });
      }
    },

    pause: async () => {
      await TrackPlayer.pause();
    },

    resume: async () => {
      await TrackPlayer.play();
    },

    togglePlay: async () => {
      const { isPlaying } = get();
      if (isPlaying) await get().pause();
      else await get().resume();
    },

    seekTo: async (positionMs) => {
      await TrackPlayer.seekTo(positionMs / 1000);
      set({ position: positionMs });
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
          else return; // End of queue, nothing to do
        }
      }
      set({ currentIndex: nextIndex });
      await get()._loadAndPlay(queue[nextIndex]);
    },

    skipPrevious: async () => {
      const { queue, currentIndex, position, shuffleMode, shuffledIndices } = get();
      if (!queue.length) return;

      // If more than 3 seconds in, restart the current track
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
      const next: RepeatMode =
        repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
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
        const newIndex =
          index < state.currentIndex
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

    setBlockingOverlayVisible: (visible) => {
      set({ isBlockingOverlayVisible: visible });
    },

    cleanup: async () => {
      await TrackPlayer.reset();
      set({ isPlaying: false, position: 0 });
    },
  };
});
