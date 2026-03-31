import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { Song } from '../api/saavn';
import SongRow from '../components/SongRow';
import SongOptionsSheet from '../components/SongOptionsSheet';
import { FavoritesStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<FavoritesStackParamList>;

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();
  const { favorites } = useLibraryStore();
  const { playQueue } = usePlayerStore();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);

  const handleFavoriteSongPress = useCallback((song: Song) => {
    playQueue(favorites, favorites.findIndex((x) => x.id === song.id));
  }, [favorites, playQueue]);

  const handleSongOptionsPress = useCallback((song: Song) => {
    setSelectedSong(song);
    setOptionsVisible(true);
  }, []);

  const renderFavoriteSong = useCallback(({ item }: { item: Song }) => (
    <SongRow
      song={item}
      onPress={handleFavoriteSongPress}
      onOptionsPress={handleSongOptionsPress}
    />
  ), [handleFavoriteSongPress, handleSongOptionsPress]);

  const getSongItemLayout = useCallback((_: ArrayLike<Song> | null | undefined, index: number) => ({
    length: 72,
    offset: 72 * index,
    index,
  }), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <View style={styles.logoRow}>
          <Ionicons name="musical-notes" size={28} color={Colors.primary} />
          <Text style={[styles.logoText, { color: colors.text }]}>Groovr</Text>
        </View>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={72} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Favorites Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Songs you like will appear here
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.listHeader, { borderBottomColor: colors.separator }]}>
            <Text style={[styles.listCount, { color: colors.text }]}>
              {favorites.length}<Text style={styles.listCountWord}> song{favorites.length !== 1 ? 's' : ''}</Text>
            </Text>
            <TouchableOpacity
              style={[styles.playAllBtn, { backgroundColor: Colors.primary }]}
              onPress={() => playQueue(favorites, 0)}
            >
              <Ionicons name="play" size={14} color="#fff" />
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={favorites}
            keyExtractor={item => item.id}
            renderItem={renderFavoriteSong}
            getItemLayout={getSongItemLayout}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={50}
            windowSize={5}
            removeClippedSubviews
            contentContainerStyle={{ paddingBottom: 140 }}
          />
        </>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', marginTop: 16 },
  emptySubtitle: { fontSize: 15, marginTop: 8, textAlign: 'center' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  listCount: { fontSize: 17 },
  listCountWord: { fontFamily: 'Flamante-Roma-Medium', fontWeight: 'normal' },
  playAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  playAllText: { color: '#fff', fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', fontSize: 13 },
});
