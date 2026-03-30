import { NavigatorScreenParams } from '@react-navigation/native';

// ─── Tab Navigator ─────────────────────────────────────────────────────────
export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  SearchTab: NavigatorScreenParams<SearchStackParamList>;
  FavoritesTab: NavigatorScreenParams<FavoritesStackParamList>;
  PlaylistsTab: NavigatorScreenParams<PlaylistsStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// ─── Home Stack ────────────────────────────────────────────────────────────
export type HomeStackParamList = {
  Home: undefined;
  ArtistDetails: { artistId: string; artistName: string };
  AlbumDetails: { albumId: string; albumName: string };
};

// ─── Search Stack ──────────────────────────────────────────────────────────
export type SearchStackParamList = {
  Search: undefined;
  ArtistDetails: { artistId: string; artistName: string };
  AlbumDetails: { albumId: string; albumName: string };
};

// ─── Favorites Stack ───────────────────────────────────────────────────────
export type FavoritesStackParamList = {
  Favorites: undefined;
  ArtistDetails: { artistId: string; artistName: string };
  AlbumDetails: { albumId: string; albumName: string };
};

// ─── Playlists Stack ───────────────────────────────────────────────────────
export type PlaylistsStackParamList = {
  Playlists: undefined;
  PlaylistDetails: { playlistId: string };
};

// ─── Settings Stack ────────────────────────────────────────────────────────
export type SettingsStackParamList = {
  Settings: undefined;
};

// ─── Root Stack (modal layer) ──────────────────────────────────────────────
export type RootStackParamList = {
  Main: NavigatorScreenParams<TabParamList>;
  NowPlaying: undefined;
};
