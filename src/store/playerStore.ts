import { create } from 'zustand';
import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
  Event,
  State,
  RepeatMode as NativeRepeatMode,
} from 'react-native-track-player';
import { Song, getBestDownloadUrl, getSongArtistNames, getBestImage } from '../api/saavn';
import { getJSON, setJSON, STORAGE_KEYS } from '../utils/storage';

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
  addToQueue: (song: Song) => Promise<void>;
  playNext: (song: Song) => Promise<void>;
  removeFromQueue: (index: number) => void;

  // Downloads
  setDownloadProgress: (id: string, progress: number) => void;
  markDownloaded: (id: string) => void;
  removeDownload: (id: string) => void;
  setBlockingOverlayVisible: (visible: boolean) => void;
  hydrate: () => void;

  // Internal
  _loadAndPlay: (song: Song, startPositionMs?: number) => Promise<void>;
  cleanup: () => Promise<void>;

  // Computed helpers
  currentSong: () => Song | null;
}

type PlayerStore = PlayerState & PlayerActions;

interface LastPlayedSnapshot {
  queue: Song[];
  currentIndex: number;
  position: number;
  duration: number;
  repeatMode: RepeatMode;
  shuffleMode: boolean;
  shuffledIndices: number[];
  updatedAt: number;
}

let _lastSnapshotSaveAt = 0;

function persistLastPlayedSnapshot(state: PlayerState, force = false) {
  if (!state.queue.length) return;

  const now = Date.now();
  if (!force && now - _lastSnapshotSaveAt < 1000) return;

  const currentIndex = Math.max(0, Math.min(state.currentIndex, state.queue.length - 1));
  const snapshot: LastPlayedSnapshot = {
    queue: state.queue,
    currentIndex,
    position: Math.max(0, state.position),
    duration: Math.max(0, state.duration),
    repeatMode: state.repeatMode,
    shuffleMode: state.shuffleMode,
    shuffledIndices: state.shuffledIndices,
    updatedAt: now,
  };

  setJSON(STORAGE_KEYS.LAST_PLAYED, snapshot);
  _lastSnapshotSaveAt = now;
}

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
      progressUpdateEventInterval: 0.25,
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.Skip,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.Skip,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
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

function toNativeRepeatMode(mode: RepeatMode): NativeRepeatMode {
  switch (mode) {
    case 'one':
      return NativeRepeatMode.Track;
    case 'all':
      return NativeRepeatMode.Queue;
    default:
      return NativeRepeatMode.Off;
  }
}

async function syncNativeRepeatMode(mode: RepeatMode) {
  try {
    await ensurePlayerReady();
    await TrackPlayer.setRepeatMode(toNativeRepeatMode(mode));
  } catch (err) {
    console.error('Failed to sync native repeat mode:', err);
  }
}

export const usePlayerStore = create<PlayerStore>((set, get) => {
  // Subscribe to RNTP events at store creation time (closure captures set/get)
  TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
    set({
      isPlaying: e.state === State.Playing,
      isLoading: e.state === State.Loading || e.state === State.Buffering,
    });
    persistLastPlayedSnapshot(get(), true);
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
    set({
      position: Math.floor(e.position * 1000),
      duration: Math.floor(e.duration * 1000),
    });
    persistLastPlayedSnapshot(get());
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (e) => {
    if (typeof e.index === 'number') {
      set({ currentIndex: e.index, position: 0 });
      persistLastPlayedSnapshot(get(), true);
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
    console.error('Playback error:', e);
    set({ isLoading: false, isPlaying: false });
    persistLastPlayedSnapshot(get(), true);
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

    hydrate: () => {
      const snapshot = getJSON<LastPlayedSnapshot | null>(STORAGE_KEYS.LAST_PLAYED, null);
      if (!snapshot || !Array.isArray(snapshot.queue) || !snapshot.queue.length) return;

      const safeIndex = Math.max(0, Math.min(snapshot.currentIndex ?? 0, snapshot.queue.length - 1));
      set({
        queue: snapshot.queue,
        currentIndex: safeIndex,
        position: Math.max(0, snapshot.position ?? 0),
        duration: Math.max(0, snapshot.duration ?? 0),
        repeatMode: snapshot.repeatMode ?? 'none',
        shuffleMode: Boolean(snapshot.shuffleMode),
        shuffledIndices: Array.isArray(snapshot.shuffledIndices) ? snapshot.shuffledIndices : [],
      });
      void syncNativeRepeatMode(snapshot.repeatMode ?? 'none');
    },

    currentSong: () => {
      const { queue, currentIndex } = get();
      return queue[currentIndex] ?? null;
    },

    playQueue: async (songs, startIndex = 0) => {
      if (!songs.length) return;
      const shuffledIndices = buildShuffledIndices(songs.length, startIndex);
      set({ queue: songs, currentIndex: startIndex, shuffledIndices });
      persistLastPlayedSnapshot(get(), true);
      await get()._loadAndPlay(songs[startIndex]);
    },

    playSong: async (song) => {
      const { queue } = get();
      const existingIdx = queue.findIndex(s => s.id === song.id);
      if (existingIdx >= 0) {
        set({ currentIndex: existingIdx });
        persistLastPlayedSnapshot(get(), true);
        await get()._loadAndPlay(song);
      } else {
        set({ queue: [song], currentIndex: 0, shuffledIndices: [0] });
        persistLastPlayedSnapshot(get(), true);
        await get()._loadAndPlay(song);
      }
    },

    _loadAndPlay: async (song, startPositionMs = 0) => {
      set({ isLoading: true, position: Math.max(0, startPositionMs), duration: 0 });
      try {
        await ensurePlayerReady();
        const { queue, currentIndex, repeatMode } = get();
        const tracks = (queue.length ? queue : [song]).map(songToTrack);
        await TrackPlayer.reset();
        await TrackPlayer.add(tracks);
        await TrackPlayer.setRepeatMode(toNativeRepeatMode(repeatMode));
        if (currentIndex > 0) {
          await TrackPlayer.skip(currentIndex);
        }
        if (startPositionMs > 0) {
          await TrackPlayer.seekTo(startPositionMs / 1000);
        }
        await TrackPlayer.play();
        set({ isLoading: false });
        persistLastPlayedSnapshot(get(), true);
      } catch (err) {
        console.error('Failed to load song:', err);
        set({ isLoading: false, isPlaying: false });
      }
    },

    pause: async () => {
      await TrackPlayer.pause();
    },

    resume: async () => {
      const activeIndex = await TrackPlayer.getActiveTrackIndex().catch(() => undefined);
      if (activeIndex == null) {
        const { currentSong, position } = get();
        const song = currentSong();
        if (song) {
          await get()._loadAndPlay(song, position);
          return;
        }
      }
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
      persistLastPlayedSnapshot(get(), true);
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
      try {
        await TrackPlayer.skip(nextIndex);
        await TrackPlayer.play();
        set({ currentIndex: nextIndex, position: 0 });
        persistLastPlayedSnapshot(get(), true);
      } catch (err) {
        console.error('Failed to skip next:', err);
      }
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
      try {
        await TrackPlayer.skip(prevIndex);
        await TrackPlayer.play();
        set({ currentIndex: prevIndex, position: 0 });
        persistLastPlayedSnapshot(get(), true);
      } catch (err) {
        console.error('Failed to skip previous:', err);
      }
    },

    toggleShuffle: () => {
      const { shuffleMode, queue, currentIndex } = get();
      const newMode = !shuffleMode;
      const newIndices = newMode ? buildShuffledIndices(queue.length, currentIndex) : [];
      set({ shuffleMode: newMode, shuffledIndices: newIndices });
      persistLastPlayedSnapshot(get(), true);
    },

    toggleRepeat: () => {
      const { repeatMode } = get();
      const next: RepeatMode =
        repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
      set({ repeatMode: next });
      void syncNativeRepeatMode(next);
      persistLastPlayedSnapshot(get(), true);
    },

    addToQueue: async (song) => {
      const { queue } = get();
      if (!queue.length) {
        // Nothing playing yet — start playing this song
        set({ queue: [song], currentIndex: 0, shuffledIndices: [0] });
        await get()._loadAndPlay(song);
        return;
      }
      set(state => ({ queue: [...state.queue, song] }));
      try {
        // Append to the end of the RNTP queue (FIFO)
        await TrackPlayer.add(songToTrack(song));
      } catch (err) {
        console.error('addToQueue: failed to sync RNTP queue', err);
      }
      persistLastPlayedSnapshot(get(), true);
    },

    playNext: async (song) => {
      const { queue, currentIndex } = get();
      if (!queue.length) {
        // Nothing playing yet — start playing this song immediately
        set({ queue: [song], currentIndex: 0, shuffledIndices: [0] });
        await get()._loadAndPlay(song);
        return;
      }
      const insertAt = currentIndex + 1;
      set(state => {
        const newQueue = [...state.queue];
        newQueue.splice(insertAt, 0, song);
        return { queue: newQueue };
      });
      try {
        // Insert into the RNTP queue right after the current track
        await TrackPlayer.add(songToTrack(song), insertAt);
      } catch (err) {
        console.error('playNext: failed to sync RNTP queue', err);
      }
      persistLastPlayedSnapshot(get(), true);
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
      persistLastPlayedSnapshot(get(), true);
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
      persistLastPlayedSnapshot(get(), true);
    },
  };
});
