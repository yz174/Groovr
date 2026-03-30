import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import {
  Song, Album, Artist,
  searchSongs, searchAlbums, searchArtists,
  getBestImage, getSongArtistNames, hasArtistImage, isSingleArtistCandidate,
} from '../api/saavn';
import { usePlayerStore } from '../store/playerStore';
import SongRow from '../components/SongRow';
import AlbumCard from '../components/AlbumCard';
import ArtistCard from '../components/ArtistCard';
import SongOptionsSheet from '../components/SongOptionsSheet';
import { HomeStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<HomeStackParamList>;

type HomeTab = 'Suggested' | 'Songs' | 'Artists' | 'Albums';
const TABS: HomeTab[] = ['Suggested', 'Songs', 'Artists', 'Albums'];

const SCREEN_WIDTH = Dimensions.get('window').width;

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

  const [activeTab, setActiveTab] = useState<HomeTab>('Suggested');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [mostPlayed, setMostPlayed] = useState<Song[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);

  const [sortMode, setSortMode] = useState<'Ascending' | 'Descending'>('Ascending');
  const [showSort, setShowSort] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s1, s2, s3, allSongs, allAlbums] = await Promise.all([
        searchSongs(QUERIES.suggested[0], 6),
        searchSongs(QUERIES.suggested[1], 6),
        searchSongs(QUERIES.suggested[2], 10),
        searchSongs(QUERIES.songs, 30),
        searchAlbums(QUERIES.albums, 20),
      ]);
      setRecentlyPlayed(s1);
      setTrendingSongs(s2);
      setMostPlayed(s3);
      setSongs(allSongs);
      setAlbums(allAlbums);

      // Load artists
      const artistResults = await Promise.all(
        QUERIES.artists.map(q => searchArtists(q, 3))
      );
      const merged = artistResults.flat().slice(0, 18);
      const unique = merged.filter((a, i) => merged.findIndex(x => x.id === a.id) === i);
      const preferred = unique.filter(a => isSingleArtistCandidate(a) && hasArtistImage(a));
      const fallback = unique.filter(a => isSingleArtistCandidate(a) && !hasArtistImage(a));
      setArtists([...preferred, ...fallback].slice(0, 18));
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSongPress = useCallback((song: Song, queue?: Song[]) => {
    const q = queue ?? songs;
    const idx = q.findIndex(s => s.id === song.id);
    playQueue(q, idx >= 0 ? idx : 0);
  }, [songs, playQueue]);

  const handleArtistPress = useCallback((artist: Artist) => {
    navigation.navigate('ArtistDetails', { artistId: artist.id, artistName: artist.name });
  }, [navigation]);

  const handleAlbumPress = useCallback((album: Album) => {
    navigation.navigate('AlbumDetails', { albumId: album.id, albumName: album.name });
  }, [navigation]);

  const openSearch = useCallback(() => {
    (navigation as any).navigate('SearchFlow', { screen: 'Search' });
  }, [navigation]);

  const sortedSongs = [...songs].sort((a, b) => {
    return sortMode === 'Ascending' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
  });

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
          onOptionsPress={(song) => { setSelectedSong(song); setOptionsVisible(true); }}
          colors={colors}
        />;

      case 'Songs':
        return (
          <View style={{ flex: 1 }}>
            <View style={[styles.listHeader, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.listCount, { color: colors.text }]}>
                {sortedSongs.length} songs
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
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <SongRow
                  song={item}
                  onPress={(s) => handleSongPress(s, sortedSongs)}
                  onOptionsPress={(s) => { setSelectedSong(s); setOptionsVisible(true); }}
                />
              )}
              contentContainerStyle={{ paddingBottom: 140 }}
            />
          </View>
        );

      case 'Artists':
        return (
          <FlatList
            key="home-artists-grid-3"
            data={artists}
            keyExtractor={item => item.id}
            numColumns={3}
            renderItem={({ item }) => (
              <View style={{ flex: 1, alignItems: 'center', marginVertical: 8 }}>
                <ArtistCard artist={item} onPress={handleArtistPress} size={90} />
              </View>
            )}
            contentContainerStyle={{ padding: 8, paddingBottom: 140 }}
          />
        );

      case 'Albums':
        return (
          <FlatList
            key="home-albums-grid-2"
            data={albums}
            keyExtractor={item => item.id}
            numColumns={2}
            renderItem={({ item }) => (
              <View style={{ flex: 1, padding: 8 }}>
                <AlbumCard album={item} onPress={handleAlbumPress} size={(SCREEN_WIDTH - 48) / 2} />
              </View>
            )}
            contentContainerStyle={{ padding: 8, paddingBottom: 140 }}
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
            onPress={() => setActiveTab(tab)}
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
  colors: any;
}

function SuggestedTab({ recentlyPlayed, artists, mostPlayed, trendingSongs, onSongPress, onArtistPress, onOptionsPress, colors }: SuggestedTabProps) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently Played</Text>
            <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
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
            <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
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
            <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
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
      {trendingSongs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Songs</Text>
            <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
          </View>
          {trendingSongs.slice(0, 6).map(song => (
            <SongRow
              key={song.id}
              song={song}
              onPress={(s) => onSongPress(s, trendingSongs)}
              onOptionsPress={onOptionsPress}
              compact
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

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
  listCount: { fontSize: 17, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
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
});
