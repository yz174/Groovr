import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { Song, getBestDownloadUrl, getBestImage, getSongArtistNames } from '../api/saavn';
import { getJSON, setJSON, STORAGE_KEYS } from '../utils/storage';
import { usePlayerStore } from './playerStore';

export interface DownloadedSong {
  song: Song;
  localPath: string;
  downloadedAt: number;
  size?: number;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: number;
  coverImage?: string;
}

interface LibraryState {
  favorites: Song[];
  downloads: DownloadedSong[];
  playlists: Playlist[];
}

interface LibraryActions {
  // Favorites
  toggleFavorite: (song: Song) => void;
  isFavorite: (id: string) => boolean;

  // Downloads
  downloadSong: (song: Song, quality?: string) => Promise<void>;
  deleteDownload: (songId: string) => Promise<void>;
  isDownloaded: (id: string) => boolean;
  getLocalPath: (id: string) => string | null;

  // Playlists
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, song: Song) => void;
  removeFromPlaylist: (playlistId: string, songId: string) => void;
  renamePlaylist: (id: string, name: string) => void;

  // Init
  hydrate: () => void;
}

type LibraryStore = LibraryState & LibraryActions;

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  favorites: [],
  downloads: [],
  playlists: [],

  hydrate: () => {
    const favorites = getJSON<Song[]>(STORAGE_KEYS.FAVORITES, []);
    const downloads = getJSON<DownloadedSong[]>(STORAGE_KEYS.DOWNLOADS, []);
    const playlists = getJSON<Playlist[]>(STORAGE_KEYS.PLAYLISTS, []);
    set({ favorites, downloads, playlists });

    // Restore download status in player store
    const playerStore = usePlayerStore.getState();
    downloads.forEach(d => playerStore.markDownloaded(d.song.id));
  },

  toggleFavorite: (song) => {
    set(state => {
      const exists = state.favorites.some(f => f.id === song.id);
      const newFavorites = exists
        ? state.favorites.filter(f => f.id !== song.id)
        : [song, ...state.favorites];
      setJSON(STORAGE_KEYS.FAVORITES, newFavorites);
      return { favorites: newFavorites };
    });
  },

  isFavorite: (id) => get().favorites.some(f => f.id === id),

  downloadSong: async (song, quality = '320kbps') => {
    const { isDownloaded } = get();
    if (isDownloaded(song.id)) return;

    const url = getBestDownloadUrl(song.downloadUrl, quality);
    if (!url) throw new Error('No download URL available');

    const dir = FileSystem.documentDirectory + 'downloads/';
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

    const localPath = `${dir}${song.id}.mp4`;
    const playerStore = usePlayerStore.getState();

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localPath,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        const progress = totalBytesExpectedToWrite > 0
          ? totalBytesWritten / totalBytesExpectedToWrite
          : 0;
        playerStore.setDownloadProgress(song.id, progress);
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (result?.uri) {
      const info = await FileSystem.getInfoAsync(result.uri);
      const downloadedSong: DownloadedSong = {
        song,
        localPath: result.uri,
        downloadedAt: Date.now(),
        size: info.exists && 'size' in info ? (info as any).size : undefined,
      };
      set(state => {
        const newDownloads = [downloadedSong, ...state.downloads];
        setJSON(STORAGE_KEYS.DOWNLOADS, newDownloads);
        return { downloads: newDownloads };
      });
      playerStore.markDownloaded(song.id);
    }
  },

  deleteDownload: async (songId) => {
    const { downloads } = get();
    const item = downloads.find(d => d.song.id === songId);
    if (item) {
      await FileSystem.deleteAsync(item.localPath, { idempotent: true }).catch(() => {});
    }
    set(state => {
      const newDownloads = state.downloads.filter(d => d.song.id !== songId);
      setJSON(STORAGE_KEYS.DOWNLOADS, newDownloads);
      return { downloads: newDownloads };
    });
    usePlayerStore.getState().removeDownload(songId);
  },

  isDownloaded: (id) => get().downloads.some(d => d.song.id === id),

  getLocalPath: (id) => {
    const item = get().downloads.find(d => d.song.id === id);
    return item?.localPath ?? null;
  },

  createPlaylist: (name) => {
    const playlist: Playlist = {
      id: Date.now().toString(),
      name,
      songs: [],
      createdAt: Date.now(),
    };
    set(state => {
      const newPlaylists = [playlist, ...state.playlists];
      setJSON(STORAGE_KEYS.PLAYLISTS, newPlaylists);
      return { playlists: newPlaylists };
    });
    return playlist;
  },

  deletePlaylist: (id) => {
    set(state => {
      const newPlaylists = state.playlists.filter(p => p.id !== id);
      setJSON(STORAGE_KEYS.PLAYLISTS, newPlaylists);
      return { playlists: newPlaylists };
    });
  },

  addToPlaylist: (playlistId, song) => {
    set(state => {
      const newPlaylists = state.playlists.map(p =>
        p.id === playlistId && !p.songs.some(s => s.id === song.id)
          ? { ...p, songs: [...p.songs, song], coverImage: p.coverImage ?? getBestImage(song.image) }
          : p
      );
      setJSON(STORAGE_KEYS.PLAYLISTS, newPlaylists);
      return { playlists: newPlaylists };
    });
  },

  removeFromPlaylist: (playlistId, songId) => {
    set(state => {
      const newPlaylists = state.playlists.map(p =>
        p.id === playlistId ? { ...p, songs: p.songs.filter(s => s.id !== songId) } : p
      );
      setJSON(STORAGE_KEYS.PLAYLISTS, newPlaylists);
      return { playlists: newPlaylists };
    });
  },

  renamePlaylist: (id, name) => {
    set(state => {
      const newPlaylists = state.playlists.map(p => p.id === id ? { ...p, name } : p);
      setJSON(STORAGE_KEYS.PLAYLISTS, newPlaylists);
      return { playlists: newPlaylists };
    });
  },
}));
