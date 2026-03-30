import { create } from 'zustand';
import { ColorScheme } from '../theme/colors';
import { getJSON, setJSON, STORAGE_KEYS } from '../utils/storage';

export type AudioQuality = '96kbps' | '160kbps' | '320kbps';

interface SettingsState {
  theme: ColorScheme | 'system';
  audioQuality: AudioQuality;
  downloadQuality: AudioQuality;
  streamOverCellular: boolean;
  downloadOverCellular: boolean;
}

interface SettingsActions {
  setTheme: (theme: SettingsState['theme']) => void;
  setAudioQuality: (q: AudioQuality) => void;
  setDownloadQuality: (q: AudioQuality) => void;
  setStreamOverCellular: (v: boolean) => void;
  setDownloadOverCellular: (v: boolean) => void;
  hydrate: () => void;
}

const DEFAULTS: SettingsState = {
  theme: 'system',
  audioQuality: '320kbps',
  downloadQuality: '320kbps',
  streamOverCellular: true,
  downloadOverCellular: false,
};

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  ...DEFAULTS,

  setTheme: (theme) => {
    setJSON(STORAGE_KEYS.THEME, theme);
    set({ theme });
  },
  setAudioQuality: (q) => {
    setJSON(STORAGE_KEYS.AUDIO_QUALITY, q);
    set({ audioQuality: q });
  },
  setDownloadQuality: (q) => set({ downloadQuality: q }),
  setStreamOverCellular: (v) => set({ streamOverCellular: v }),
  setDownloadOverCellular: (v) => set({ downloadOverCellular: v }),

  hydrate: () => {
    const theme = getJSON<SettingsState['theme']>(STORAGE_KEYS.THEME, 'system');
    const audioQuality = getJSON<AudioQuality>(STORAGE_KEYS.AUDIO_QUALITY, '320kbps');
    set({ theme, audioQuality });
  },
}));
