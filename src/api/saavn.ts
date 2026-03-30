const BASE_URL = 'https://saavn.sumit.co';

export interface SongImage {
  quality: string;
  url?: string;
  link?: string;
}

export interface DownloadUrl {
  quality: string;
  url?: string;
  link?: string;
}

export interface Song {
  id: string;
  name: string;
  duration: number | string;
  language?: string;
  year?: string;
  playCount?: string;
  hasLyrics?: string;
  album: {
    id: string;
    name: string;
    url?: string;
  };
  artists?: {
    primary?: Array<{ id: string; name: string }>;
    featured?: Array<{ id: string; name: string }>;
    all?: Array<{ id: string; name: string; role?: string }>;
  };
  primaryArtists?: string;
  primaryArtistsId?: string;
  image: SongImage[];
  downloadUrl: DownloadUrl[];
  url?: string;
}

export interface Album {
  id: string;
  name: string;
  year?: string;
  songCount?: number | string;
  image: SongImage[];
  artists?: Array<{ id: string; name: string }>;
  primaryArtists?: string;
  url?: string;
}

export interface Artist {
  id: string;
  name: string;
  image?: SongImage[];
  followerCount?: number | string;
  fanCount?: string;
  bio?: string;
  availableLanguages?: string[];
  isVerified?: boolean;
  dominantLanguage?: string;
  dominantType?: string;
  topSongs?: Song[];
  topAlbums?: Album[];
}

export interface Playlist {
  id: string;
  name: string;
  songCount?: number | string;
  image?: SongImage[];
  url?: string;
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Search ────────────────────────────────────────────────────────────────

export async function searchSongs(query: string, limit = 20, page = 1) {
  const data = await fetchAPI<any>(
    `/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}&page=${page}`
  );
  return (data?.data?.results ?? []) as Song[];
}

export async function searchAlbums(query: string, limit = 20) {
  const data = await fetchAPI<any>(
    `/api/search/albums?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  return (data?.data?.results ?? []) as Album[];
}

export async function searchArtists(query: string, limit = 20) {
  const data = await fetchAPI<any>(
    `/api/search/artists?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  return (data?.data?.results ?? []) as Artist[];
}

export async function searchPlaylists(query: string, limit = 20) {
  const data = await fetchAPI<any>(
    `/api/search/playlists?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  return (data?.data?.results ?? []) as Playlist[];
}

export async function searchAll(query: string) {
  const data = await fetchAPI<any>(
    `/api/search?query=${encodeURIComponent(query)}`
  );
  return data?.data ?? {};
}

// ─── Songs ─────────────────────────────────────────────────────────────────

export async function getSong(id: string): Promise<Song | null> {
  const data = await fetchAPI<any>(`/api/songs/${id}`);
  const results = data?.data ?? [];
  return results[0] ?? null;
}

export async function getSongSuggestions(id: string): Promise<Song[]> {
  const data = await fetchAPI<any>(`/api/songs/${id}/suggestions`);
  return (data?.data ?? []) as Song[];
}

// ─── Artists ───────────────────────────────────────────────────────────────

export async function getArtist(id: string): Promise<Artist | null> {
  const data = await fetchAPI<any>(`/api/artists/${id}`);
  return (data?.data ?? null) as Artist | null;
}

export async function getArtistSongs(id: string, page = 0, sortBy = 'popularity') {
  const data = await fetchAPI<any>(
    `/api/artists/${id}/songs?page=${page}&sortBy=${sortBy}`
  );
  return (data?.data?.songs ?? data?.data?.results ?? []) as Song[];
}

export async function getArtistAlbums(id: string, page = 0, sortBy = 'release_date') {
  const data = await fetchAPI<any>(
    `/api/artists/${id}/albums?page=${page}&sortBy=${sortBy}`
  );
  return (data?.data?.albums ?? data?.data?.results ?? []) as Album[];
}

// ─── Albums ────────────────────────────────────────────────────────────────

export async function getAlbum(id: string) {
  const data = await fetchAPI<any>(`/api/albums?id=${id}`);
  return data?.data ?? null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function getBestImage(images: SongImage[], preferSize = '500x500'): string {
  if (!images || images.length === 0) return '';
  const preferred = images.find(img => img.quality === preferSize);
  if (preferred) return preferred.url ?? preferred.link ?? '';
  const last = images[images.length - 1];
  return last?.url ?? last?.link ?? '';
}

export function getBestDownloadUrl(urls: DownloadUrl[], preferQuality = '320kbps'): string {
  if (!urls || urls.length === 0) return '';
  const preferred = urls.find(u => u.quality === preferQuality);
  if (preferred) return preferred.url ?? preferred.link ?? '';
  // Fallback to highest available
  const sorted = [...urls].reverse();
  const fallback = sorted[0];
  return fallback?.url ?? fallback?.link ?? '';
}

export function getSongArtistNames(song: Song): string {
  if (song.artists?.primary?.length) {
    return song.artists.primary.map(a => a.name).join(', ');
  }
  return song.primaryArtists ?? 'Unknown Artist';
}

export function getAlbumArtistNames(album: Partial<Album> | null | undefined): string {
  if (!album) return '';

  if (typeof album.primaryArtists === 'string' && album.primaryArtists.trim().length > 0) {
    return album.primaryArtists;
  }

  const artistsValue = (album as any).artists;

  if (Array.isArray(artistsValue)) {
    const names = artistsValue
      .map((a: any) => a?.name)
      .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0);

    if (names.length > 0) return names.join(', ');
  }

  if (artistsValue && typeof artistsValue === 'object') {
    const nested = [artistsValue.primary, artistsValue.featured, artistsValue.all]
      .filter(Array.isArray)
      .flat()
      .map((a: any) => a?.name)
      .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0);

    if (nested.length > 0) return nested.join(', ');
  }

  return '';
}

export function formatDuration(seconds: number | string): string {
  const s = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  return `${m}:${rem.toString().padStart(2, '0')}`;
}
