import { create } from 'zustand';
import { Song, Album, Artist, Playlist } from '../api/saavn';
import { getJSON, setJSON, STORAGE_KEYS } from '../utils/storage';

interface SearchState {
  query: string;
  results: {
    songs: Song[];
    albums: Album[];
    artists: Artist[];
    playlists: Playlist[];
  };
  isLoading: boolean;
  activeTab: 'Songs' | 'Albums' | 'Artists' | 'Playlists';
  recentSearches: string[];
}

interface SearchActions {
  setQuery: (q: string) => void;
  setResults: (results: Partial<SearchState['results']>) => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: 'Songs' | 'Albums' | 'Artists' | 'Playlists') => void;
  addRecentSearch: (term: string) => void;
  removeRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
  hydrate: () => void;
}

export const useSearchStore = create<SearchState & SearchActions>((set, get) => ({
  query: '',
  results: { songs: [], albums: [], artists: [], playlists: [] },
  isLoading: false,
  activeTab: 'Songs',
  recentSearches: [],

  setQuery: (q) => set({ query: q }),
  setResults: (results) => set(state => ({ results: { ...state.results, ...results } })),
  setLoading: (loading) => set({ isLoading: loading }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  addRecentSearch: (term) => {
    if (!term.trim()) return;
    set(state => {
      const filtered = state.recentSearches.filter(s => s !== term);
      const newSearches = [term, ...filtered].slice(0, 20);
      setJSON(STORAGE_KEYS.RECENT_SEARCHES, newSearches);
      return { recentSearches: newSearches };
    });
  },

  removeRecentSearch: (term) => {
    set(state => {
      const newSearches = state.recentSearches.filter(s => s !== term);
      setJSON(STORAGE_KEYS.RECENT_SEARCHES, newSearches);
      return { recentSearches: newSearches };
    });
  },

  clearRecentSearches: () => {
    setJSON(STORAGE_KEYS.RECENT_SEARCHES, []);
    set({ recentSearches: [] });
  },

  hydrate: () => {
    const recentSearches = getJSON<string[]>(STORAGE_KEYS.RECENT_SEARCHES, []);
    set({ recentSearches });
  },
}));
