import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  ListRenderItem,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import {
  Song, Album, Artist,
  searchSongs, searchAlbums, searchArtists,
  getBestImage, hasArtistImage, isSingleArtistCandidate,
} from '../api/saavn';
import { usePlayerStore } from '../store/playerStore';
import SongRow from '../components/SongRow';
import AlbumCard from '../components/AlbumCard';
import ArtistCard from '../components/ArtistCard';
import SongOptionsSheet from '../components/SongOptionsSheet';
import { HomeStackParamList } from '../navigation/types';
import { TAB_BAR_HEIGHT, MINI_PLAYER_HEIGHT } from '../components/MiniPlayer';

type NavProp = NativeStackNavigationProp<HomeStackParamList>;

type HomeTab = 'Suggested' | 'Songs' | 'Artists' | 'Albums';
const TABS: HomeTab[] = ['Suggested', 'Songs', 'Artists', 'Albums'];

const SCREEN_WIDTH = Dimensions.get('window').width;
const SONGS_PAGE_SIZE = 20;
const ALBUMS_PAGE_SIZE = 20;
const ARTISTS_PAGE_SIZE_PER_QUERY = 3;
const SUGGESTED_POPULAR_PAGE_SIZE = 12;
const SONG_ROW_HEIGHT = 72;
const COMPACT_SONG_ROW_HEIGHT = 56;
const LOAD_MORE_MIN_DURATION_MS = 260;

const QUERIES = {
  suggested: ['hindi hits 2024', 'bollywood top songs', 'arijit singh'],
  songs: 'top hindi songs 2024',
  artists: ['arijit singh', 'shreya ghoshal', 'pritam', 'ar rahman', 'sonu nigam', 'neha kakkar'],
  albums: 'bollywood album 2024',
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();
  const { playQueue } = usePlayerStore();
  const insets = useSafeAreaInsets();
  const currentSong = usePlayerStore(s => s.currentSong());
  // Dynamically accounts for tab bar, mini player (when visible), and safe area bottom inset
  const contentPaddingBottom = insets.bottom + TAB_BAR_HEIGHT + (currentSong ? MINI_PLAYER_HEIGHT + 16 : 16);

  const [activeTab, setActiveTab] = useState<HomeTab>('Suggested');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [mostPlayed, setMostPlayed] = useState<Song[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [songsLoadingMore, setSongsLoadingMore] = useState(false);
  const [artistsLoadingMore, setArtistsLoadingMore] = useState(false);
  const [albumsLoadingMore, setAlbumsLoadingMore] = useState(false);

  const [sortMode, setSortMode] = useState<'Ascending' | 'Descending'>('Ascending');
  const [showSort, setShowSort] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const songsRef = useRef<Song[]>([]);
  const sortedSongsRef = useRef<Song[]>([]);
  const songsPageRef = useRef(1);
  const songsHasMoreRef = useRef(true);
  const songsFetchingRef = useRef(false);
  const artistsPageRef = useRef(1);
  const artistsHasMoreRef = useRef(true);
  const artistsFetchingRef = useRef(false);
  const albumsPageRef = useRef(1);
  const albumsHasMoreRef = useRef(true);
  const albumsFetchingRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const mergeUniqueById = useCallback(<T extends { id: string }>(current: T[], incoming: T[]) => {
    if (incoming.length === 0) return current;
    const seen = new Set(current.map((item) => item.id));
    const appended = incoming.filter((item) => !seen.has(item.id));
    return appended.length > 0 ? [...current, ...appended] : current;
  }, []);

  const fetchArtistsPage = useCallback(async (page: number) => {
    const perQueryResults = await Promise.all(
      QUERIES.artists.map((q) => searchArtists(q, ARTISTS_PAGE_SIZE_PER_QUERY, page))
    );
    const flat = perQueryResults.flat();
    const unique = flat.filter((a, i) => flat.findIndex((x) => x.id === a.id) === i);
    const preferred = unique.filter((a) => isSingleArtistCandidate(a) && hasArtistImage(a));
    const fallback = unique.filter((a) => isSingleArtistCandidate(a) && !hasArtistImage(a));
    const merged = [...preferred, ...fallback];
    const hasMore = perQueryResults.some((items) => items.length >= ARTISTS_PAGE_SIZE_PER_QUERY);
    return { artists: merged, hasMore };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s1, s2, s3, allSongs, allAlbums, artistsPageOne] = await Promise.all([
        searchSongs(QUERIES.suggested[0], 6),
        searchSongs(QUERIES.suggested[1], SUGGESTED_POPULAR_PAGE_SIZE, 1),
        searchSongs(QUERIES.suggested[2], 10),
        searchSongs(QUERIES.songs, SONGS_PAGE_SIZE, 1),
        searchAlbums(QUERIES.albums, ALBUMS_PAGE_SIZE, 1),
        fetchArtistsPage(1),
      ]);
      setRecentlyPlayed(s1);
      setTrendingSongs(s2);
      setMostPlayed(s3);
      setSongs(allSongs);
      setAlbums(allAlbums);
      setArtists(artistsPageOne.artists);

      setSongsLoadingMore(false);
      songsPageRef.current = 1;
      songsHasMoreRef.current = allSongs.length >= SONGS_PAGE_SIZE;
      songsFetchingRef.current = false;

      setArtistsLoadingMore(false);
      artistsPageRef.current = 1;
      artistsHasMoreRef.current = artistsPageOne.hasMore;
      artistsFetchingRef.current = false;

      setAlbumsLoadingMore(false);
      albumsPageRef.current = 1;
      albumsHasMoreRef.current = allAlbums.length >= ALBUMS_PAGE_SIZE;
      albumsFetchingRef.current = false;

    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchArtistsPage]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSongPress = useCallback((song: Song, queue?: Song[]) => {
    const q = queue ?? songsRef.current;
    const idx = q.findIndex(s => s.id === song.id);
    playQueue(q, idx >= 0 ? idx : 0);
  }, [playQueue]);

  const handleArtistPress = useCallback((artist: Artist) => {
    navigation.navigate('ArtistDetails', { artistId: artist.id, artistName: artist.name });
  }, [navigation]);

  const handleAlbumPress = useCallback((album: Album) => {
    navigation.navigate('AlbumDetails', { albumId: album.id, albumName: album.name });
  }, [navigation]);

  const openSearch = useCallback(() => {
    (navigation as any).navigate('Main', { screen: 'SearchTab', params: { screen: 'Search' } });
  }, [navigation]);

  const changeHomeTab = useCallback((nextTab: HomeTab) => {
    if (activeTab === nextTab) return;
    setActiveTab(nextTab);
  }, [activeTab]);

  const loadMoreSongs = useCallback(async () => {
    if (songsFetchingRef.current || !songsHasMoreRef.current) return;
    songsFetchingRef.current = true;
    setSongsLoadingMore(true);
    const startTime = Date.now();
    try {
      const nextPage = songsPageRef.current + 1;
      const nextSongs = await searchSongs(QUERIES.songs, SONGS_PAGE_SIZE, nextPage);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSongs((prev) => mergeUniqueById(prev, nextSongs));
      songsPageRef.current = nextPage;
      const hasMore = nextSongs.length >= SONGS_PAGE_SIZE;
      songsHasMoreRef.current = hasMore;
    } catch (err) {
      console.error('Failed to load more songs:', err);
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < LOAD_MORE_MIN_DURATION_MS) {
        await new Promise((resolve) => setTimeout(resolve, LOAD_MORE_MIN_DURATION_MS - elapsed));
      }
      songsFetchingRef.current = false;
      setSongsLoadingMore(false);
    }
  }, [mergeUniqueById]);

  const loadMoreArtists = useCallback(async () => {
    if (artistsFetchingRef.current || !artistsHasMoreRef.current) return;
    artistsFetchingRef.current = true;
    setArtistsLoadingMore(true);
    const startTime = Date.now();
    try {
      const nextPage = artistsPageRef.current + 1;
      const next = await fetchArtistsPage(nextPage);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setArtists((prev) => mergeUniqueById(prev, next.artists));
      artistsPageRef.current = nextPage;
      artistsHasMoreRef.current = next.hasMore;
    } catch (err) {
      console.error('Failed to load more artists:', err);
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < LOAD_MORE_MIN_DURATION_MS) {
        await new Promise((resolve) => setTimeout(resolve, LOAD_MORE_MIN_DURATION_MS - elapsed));
      }
      artistsFetchingRef.current = false;
      setArtistsLoadingMore(false);
    }
  }, [fetchArtistsPage, mergeUniqueById]);

  const loadMoreAlbums = useCallback(async () => {
    if (albumsFetchingRef.current || !albumsHasMoreRef.current) return;
    albumsFetchingRef.current = true;
    setAlbumsLoadingMore(true);
    try {
      const nextPage = albumsPageRef.current + 1;
      const nextAlbums = await searchAlbums(QUERIES.albums, ALBUMS_PAGE_SIZE, nextPage);
      setAlbums((prev) => mergeUniqueById(prev, nextAlbums));
      albumsPageRef.current = nextPage;
      const hasMore = nextAlbums.length >= ALBUMS_PAGE_SIZE;
      albumsHasMoreRef.current = hasMore;
    } catch (err) {
      console.error('Failed to load more albums:', err);
    } finally {
      albumsFetchingRef.current = false;
      setAlbumsLoadingMore(false);
    }
  }, [mergeUniqueById]);

  const renderListFooter = useCallback((isLoadingMore: boolean) => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.listFooterLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }, []);

  const renderSongListFooter = useCallback((isLoadingMore: boolean) => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.polishedFooterLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.polishedFooterText}>Loading more songs...</Text>
      </View>
    );
  }, []);

  const renderArtistListFooter = useCallback((isLoadingMore: boolean) => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.polishedFooterLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.polishedFooterText}>Loading more artists...</Text>
      </View>
    );
  }, []);

  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      return sortMode === 'Ascending' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
  }, [songs, sortMode]);
  useEffect(() => {
    sortedSongsRef.current = sortedSongs;
  }, [sortedSongs]);

  const handleSortedSongPress = useCallback((song: Song) => {
    const q = sortedSongsRef.current;
    const idx = q.findIndex((s) => s.id === song.id);
    playQueue(q, idx >= 0 ? idx : 0);
  }, [playQueue]);

  const handleSongOptionsPress = useCallback((song: Song) => {
    setSelectedSong(song);
    setOptionsVisible(true);
  }, []);

  const renderSortedSong = useCallback(({ item }: { item: Song }) => (
    <SongRow
      song={item}
      onPress={handleSortedSongPress}
      onOptionsPress={handleSongOptionsPress}
    />
  ), [handleSongOptionsPress, handleSortedSongPress]);

  const getSongItemLayout = useCallback((_: ArrayLike<Song> | null | undefined, index: number) => ({
    length: SONG_ROW_HEIGHT,
    offset: SONG_ROW_HEIGHT * index,
    index,
  }), []);

  const renderArtistGridItem = useCallback(({ item }: { item: Artist }) => (
    <View style={{ flex: 1, alignItems: 'center', marginVertical: 8 }}>
      <ArtistCard artist={item} onPress={handleArtistPress} size={90} />
    </View>
  ), [handleArtistPress]);

  const renderAlbumGridItem = useCallback(({ item }: { item: Album }) => (
    <View style={{ flex: 1, padding: 8 }}>
      <AlbumCard album={item} onPress={handleAlbumPress} size={(SCREEN_WIDTH - 48) / 2} />
    </View>
  ), [handleAlbumPress]);

  const songKeyExtractor = useCallback((item: Song) => item.id, []);
  const artistKeyExtractor = useCallback((item: Artist) => item.id, []);
  const albumKeyExtractor = useCallback((item: Album) => item.id, []);

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    switch (activeTab) {
      case 'Suggested':
        return <SuggestedTab
          recentlyPlayed={recentlyPlayed}
          artists={artists}
          mostPlayed={mostPlayed}
          trendingSongs={trendingSongs}
          onSongPress={handleSongPress}
          onArtistPress={handleArtistPress}
          onOptionsPress={handleSongOptionsPress}
          onSeeAll={(section) => {
            if (section === 'artists') changeHomeTab('Artists');
            else changeHomeTab('Songs');
          }}
          onViewMoreSongs={() => changeHomeTab('Songs')}
          contentPaddingBottom={contentPaddingBottom}
          colors={colors}
        />;

      case 'Songs':
        return (
          <View style={{ flex: 1 }}>
            <View style={[styles.listHeader, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.listCount, { color: colors.text }]}>
                {sortedSongs.length}<Text style={styles.listCountWord}> songs</Text>
              </Text>
              <TouchableOpacity
                style={styles.sortBtn}
                onPress={() => setShowSort(v => !v)}
              >
                <Text style={[styles.sortLabel, { color: Colors.primary }]}>{sortMode}</Text>
                <Ionicons name="swap-vertical" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            {showSort && (
              <View style={[styles.sortDropdown, { backgroundColor: colors.surfaceElevated, shadowColor: colors.text }]}>
                {(['Ascending', 'Descending'] as const).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.sortOption}
                    onPress={() => { setSortMode(opt); setShowSort(false); }}
                  >
                    <View style={[styles.radio, { borderColor: Colors.primary }]}>
                      {sortMode === opt && <View style={[styles.radioDot, { backgroundColor: Colors.primary }]} />}
                    </View>
                    <Text style={[styles.sortOptionText, { color: colors.text }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <FlatList
              key="home-songs-list"
              data={sortedSongs}
              keyExtractor={songKeyExtractor}
              renderItem={renderSortedSong}
              getItemLayout={getSongItemLayout}
              initialNumToRender={15}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              windowSize={11}
              removeClippedSubviews={Platform.OS === 'android'}
              onEndReached={loadMoreSongs}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderSongListFooter(songsLoadingMore)}
              contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
            />
          </View>
        );

      case 'Artists':
        return (
          <FlatList
            key="home-artists-grid-3"
            data={artists}
            keyExtractor={artistKeyExtractor}
            numColumns={3}
            renderItem={renderArtistGridItem}
            initialNumToRender={15}
            maxToRenderPerBatch={9}
            updateCellsBatchingPeriod={50}
            windowSize={9}
            removeClippedSubviews={Platform.OS === 'android'}
            onEndReached={loadMoreArtists}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderArtistListFooter(artistsLoadingMore)}
            contentContainerStyle={{ padding: 8, paddingBottom: contentPaddingBottom }}
          />
        );

      case 'Albums':
        return (
          <FlatList
            key="home-albums-grid-2"
            data={albums}
            keyExtractor={albumKeyExtractor}
            numColumns={2}
            renderItem={renderAlbumGridItem}
            initialNumToRender={12}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={50}
            windowSize={9}
            removeClippedSubviews={Platform.OS === 'android'}
            onEndReached={loadMoreAlbums}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderListFooter(albumsLoadingMore)}
            contentContainerStyle={{ padding: 8, paddingBottom: contentPaddingBottom }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Ionicons name="musical-notes" size={28} color={Colors.primary} />
          <Text style={[styles.logoText, { color: colors.text }]}>Groovr</Text>
        </View>
        <TouchableOpacity hitSlop={8} onPress={openSearch}>
          <Ionicons name="search-outline" size={24} color={colors.icon} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.separator }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => changeHomeTab(tab)}
            style={styles.tab}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? Colors.primary : colors.textSecondary }
            ]}>
              {tab}
            </Text>
            {activeTab === tab && (
              <View style={[styles.tabIndicator, { backgroundColor: Colors.primary }]} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

      {/* Song Options */}
      <SongOptionsSheet
        song={selectedSong}
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onGoToArtist={(id, name) => navigation.navigate('ArtistDetails', { artistId: id, artistName: name })}
        onGoToAlbum={(id, name) => navigation.navigate('AlbumDetails', { albumId: id, albumName: name })}
      />
    </SafeAreaView>
  );
}

// ─── Suggested Tab ─────────────────────────────────────────────────────────

interface SuggestedTabProps {
  recentlyPlayed: Song[];
  artists: Artist[];
  mostPlayed: Song[];
  trendingSongs: Song[];
  onSongPress: (song: Song, queue?: Song[]) => void;
  onArtistPress: (artist: Artist) => void;
  onOptionsPress: (song: Song) => void;
  onSeeAll: (section: 'recentlyPlayed' | 'artists' | 'trending' | 'popular') => void;
  onViewMoreSongs: () => void;
  contentPaddingBottom: number;
  colors: any;
}

const SuggestedTab = React.memo(function SuggestedTab({ recentlyPlayed, artists, mostPlayed, trendingSongs, onSongPress, onArtistPress, onOptionsPress, onSeeAll, onViewMoreSongs, contentPaddingBottom, colors }: SuggestedTabProps) {
  const handleTrendingSongPress = useCallback((song: Song) => {
    onSongPress(song, trendingSongs);
  }, [onSongPress, trendingSongs]);

  const renderPopularSong: ListRenderItem<Song> = useCallback(({ item }) => (
    <SongRow
      song={item}
      onPress={handleTrendingSongPress}
      onOptionsPress={onOptionsPress}
      compact
    />
  ), [handleTrendingSongPress, onOptionsPress]);

  const getCompactSongItemLayout = useCallback((_: ArrayLike<Song> | null | undefined, index: number) => ({
    length: COMPACT_SONG_ROW_HEIGHT,
    offset: COMPACT_SONG_ROW_HEIGHT * index,
    index,
  }), []);

  const header = (
    <>
      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently Played</Text>
            <TouchableOpacity onPress={() => onSeeAll('recentlyPlayed')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
            {recentlyPlayed.map(song => (
              <TouchableOpacity
                key={song.id}
                style={styles.featuredCard}
                onPress={() => onSongPress(song, recentlyPlayed)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: getBestImage(song.image, '500x500') || undefined }}
                  style={styles.featuredImage}
                  defaultSource={require('../../assets/icon.png')}
                />
                <Text style={[styles.featuredTitle, { color: colors.text }]} numberOfLines={2}>
                  {song.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Artists */}
      {artists.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Artists</Text>
            <TouchableOpacity onPress={() => onSeeAll('artists')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
            {artists.slice(0, 8).map(artist => (
              <ArtistCard key={artist.id} artist={artist} onPress={onArtistPress} size={90} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Most Played */}
      {mostPlayed.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending</Text>
            <TouchableOpacity onPress={() => onSeeAll('trending')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
            {mostPlayed.map(song => (
              <TouchableOpacity
                key={song.id}
                style={styles.featuredCard}
                onPress={() => onSongPress(song, mostPlayed)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: getBestImage(song.image, '500x500') || undefined }}
                  style={styles.featuredImage}
                  defaultSource={require('../../assets/icon.png')}
                />
                <Text style={[styles.featuredTitle, { color: colors.text }]} numberOfLines={2}>
                  {song.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Songs list preview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Songs</Text>
          <TouchableOpacity onPress={() => onSeeAll('popular')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <FlatList
      data={trendingSongs}
      keyExtractor={(item) => item.id}
      renderItem={renderPopularSong}
      ListHeaderComponent={header}
      showsVerticalScrollIndicator={false}
      getItemLayout={getCompactSongItemLayout}
      initialNumToRender={6}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={50}
      windowSize={9}
      removeClippedSubviews={Platform.OS === 'android'}
      ListFooterComponent={
        <View style={styles.viewMoreWrap}>
          <TouchableOpacity style={styles.viewMoreButton} onPress={onViewMoreSongs} activeOpacity={0.85}>
            <Text style={styles.viewMoreButtonText}>View More</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      }
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
    />
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  tabBar: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  tabBarContent: { paddingHorizontal: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 12, position: 'relative' },
  tabText: { fontSize: 14, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 12, right: 12, height: 2, borderRadius: 1 },
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  seeAll: { fontSize: 14, color: Colors.primary, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  featuredCard: { width: 120, marginRight: 12 },
  featuredImage: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#ddd' },
  featuredTitle: { fontSize: 12, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', marginTop: 6, lineHeight: 16 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listCount: { fontSize: 17 },
  listCountWord: { fontFamily: 'Flamante-Roma-Medium', fontWeight: 'normal' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortLabel: { fontSize: 14, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  sortDropdown: {
    position: 'absolute',
    right: 16,
    top: 48,
    zIndex: 100,
    borderRadius: 12,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 160,
  },
  sortOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  sortOptionText: { fontSize: 15 },
  listFooterLoader: { paddingVertical: 16 },
  polishedFooterLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  polishedFooterText: {
    color: '#8B8B8B',
    fontSize: 13,
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
  },
  viewMoreWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, alignItems: 'center' },
  viewMoreButton: {
    backgroundColor: '#fff',
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  viewMoreButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
  },
});
