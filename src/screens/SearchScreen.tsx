import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { searchSongs, searchAlbums, searchArtists, Song, Album, Artist, isSingleArtistCandidate } from '../api/saavn';
import { useSearchStore } from '../store/searchStore';
import { usePlayerStore } from '../store/playerStore';
import SongRow from '../components/SongRow';
import AlbumCard from '../components/AlbumCard';
import ArtistCard from '../components/ArtistCard';
import SongOptionsSheet from '../components/SongOptionsSheet';
import { SearchStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<SearchStackParamList>;
const SEARCH_TABS = ['Songs', 'Artists', 'Albums'] as const;

export default function SearchScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();
  const {
    query, setQuery,
    results, setResults,
    isLoading, setLoading,
    activeTab, setActiveTab,
    recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches,
    recentSongs, addRecentSong,
  } = useSearchStore();
  const { playQueue } = usePlayerStore();

  const [focused, setFocused] = useState(false);
  type SearchTab = 'Songs' | 'Albums' | 'Artists';
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ songs: [], albums: [], artists: [] });
      return;
    }
    setLoading(true);
    try {
      const [songs, albums, artists] = await Promise.all([
        searchSongs(q, 20),
        searchAlbums(q, 10),
        searchArtists(q, 10),
      ]);
      setResults({ songs, albums, artists: artists.filter(isSingleArtistCandidate) });
    } catch {}
    setLoading(false);
  }, [setResults, setLoading]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(text), 400);
  };

  const handleSubmit = () => {
    if (query.trim()) {
      addRecentSearch(query.trim());
      performSearch(query.trim());
      Keyboard.dismiss();
    }
  };

  const handleRecentPress = (term: string) => {
    setQuery(term);
    addRecentSearch(term);
    performSearch(term);
    Keyboard.dismiss();
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(false);
    setQuery('');
    setResults({ songs: [], albums: [], artists: [] });
    inputRef.current?.focus();
  };

  const hasResults =
    results.songs.length > 0 || results.albums.length > 0 || results.artists.length > 0;

  const showRecents = focused && !query && recentSearches.length > 0;
  const showResults = query.length > 0 && hasResults;
  const showNotFound = query.length > 0 && !isLoading && !hasResults;

  const renderResults = () => {
    switch (activeTab) {
      case 'Songs':
        return (
          <FlatList
            key="search-songs-list"
            data={results.songs}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <SongRow
                song={item}
                onPress={(s) => {
                  addRecentSong(s);
                  playQueue(results.songs, results.songs.findIndex(x => x.id === s.id));
                }}
                onOptionsPress={(s) => { setSelectedSong(s); setOptionsVisible(true); }}
              />
            )}
            contentContainerStyle={{ paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
          />
        );
      case 'Albums':
        return (
          <FlatList
            key="search-albums-list"
            data={results.albums}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <AlbumCard
                album={item}
                horizontal
                onPress={(a) => navigation.navigate('AlbumDetails', { albumId: a.id, albumName: a.name })}
              />
            )}
            contentContainerStyle={{ paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
          />
        );
      case 'Artists':
        return (
          <FlatList
            key="search-artists-grid-3"
            data={results.artists}
            keyExtractor={item => item.id}
            numColumns={3}
            renderItem={({ item }) => (
              <View style={{ flex: 1, alignItems: 'center', marginVertical: 8 }}>
                <ArtistCard
                  artist={item}
                  size={90}
                  onPress={(a) => navigation.navigate('ArtistDetails', { artistId: a.id, artistName: a.name })}
                />
              </View>
            )}
            contentContainerStyle={{ padding: 8, paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchBarRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.searchBar, borderColor: focused ? Colors.primary : 'transparent', borderWidth: 1.5 }]}>
          <Ionicons name="search" size={18} color={focused ? Colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSubmit}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search songs, artists, albums..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPressIn={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Recent Searches */}
      {showRecents && (
        <View style={{ flex: 1 }}>
          <View style={styles.recentsHeader}>
            <Text style={[styles.recentsTitle, { color: colors.text }]}>Recent Searches</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={[styles.clearAll, { color: Colors.primary }]}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentSearches}
            keyExtractor={(item, i) => item + i}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.recentItem, { borderBottomColor: colors.separator }]}
                onPress={() => handleRecentPress(item)}
              >
                <Text style={[styles.recentText, { color: colors.text }]}>{item}</Text>
                <TouchableOpacity onPress={() => removeRecentSearch(item)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {/* Not Found */}
      {showNotFound && !isLoading && (
        <View style={styles.center}>
          <Image source={require('../../assets/NoSearch.png')} style={styles.noSearchImage} resizeMode="contain" />
        </View>
      )}

      {/* Results */}
      {showResults && !isLoading && (
        <View style={{ flex: 1 }}>
          {/* Tab Bar */}
          <View style={[styles.tabBar, { borderBottomColor: colors.separator }]}>
            {SEARCH_TABS.map(tab => (
              <TouchableOpacity key={tab} style={styles.tab} onPress={() => setActiveTab(tab as any)}>
                <Text style={[styles.tabText, { color: activeTab === tab ? Colors.primary : colors.textSecondary }]}>
                  {tab}
                </Text>
                {activeTab === tab && <View style={[styles.tabIndicator, { backgroundColor: Colors.primary }]} />}
              </TouchableOpacity>
            ))}
          </View>
          {renderResults()}
        </View>
      )}

      {/* Empty State / Recent Songs */}
      {!showRecents && !isLoading && !showResults && !showNotFound && (
        recentSongs.length > 0 ? (
          <View style={{ flex: 1 }}>
            <View style={styles.recentsHeader}>
              <Text style={[styles.recentsTitle, { color: colors.text }]}>Recently Played</Text>
            </View>
            <FlatList
              data={recentSongs}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <SongRow
                  song={item}
                  onPress={(s) => {
                    addRecentSong(s);
                    playQueue(recentSongs, recentSongs.findIndex(x => x.id === s.id));
                  }}
                  showMediaButtons={false}
                />
              )}
              contentContainerStyle={{ paddingBottom: 140 }}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        ) : (
          <View style={styles.center}>
            <Ionicons name="search-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Search for songs, artists & albums
            </Text>
          </View>
        )
      )}

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  searchBarRow: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15 },
  recentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  recentsTitle: { fontSize: 17, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  clearAll: { fontSize: 14, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  recentItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  recentText: { fontSize: 15 },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabText: { fontSize: 14, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, borderRadius: 1 },
  noSearchImage: { width: 500, height: 900 },
  notFoundText: { fontSize: 16, marginTop: 12, textAlign: 'center' },
  emptyText: { fontSize: 15, marginTop: 12, textAlign: 'center' },
});
