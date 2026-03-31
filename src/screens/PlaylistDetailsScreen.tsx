import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { Song, getBestImage } from '../api/saavn';
import SongRow from '../components/SongRow';
import SongOptionsSheet from '../components/SongOptionsSheet';
import MixedText from '../components/MixedText';
import { PlaylistsStackParamList } from '../navigation/types';

type RoutePropType = RouteProp<PlaylistsStackParamList, 'PlaylistDetails'>;

export default function PlaylistDetailsScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { playlists } = useLibraryStore();
  const { playQueue } = usePlayerStore();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);

  const playlist = playlists.find(p => p.id === route.params.playlistId);
  if (!playlist) return null;

  const coverImage = useMemo(() => {
    return playlist.coverImage
      ?? (playlist.songs[0] ? getBestImage(playlist.songs[0].image, '500x500') : null);
  }, [playlist.coverImage, playlist.songs]);

  const handlePlaylistSongPress = useCallback((song: Song) => {
    playQueue(playlist.songs, playlist.songs.findIndex((x) => x.id === song.id));
  }, [playQueue, playlist.songs]);

  const handleSongOptionsPress = useCallback((song: Song) => {
    setSelectedSong(song);
    setOptionsVisible(true);
  }, []);

  const renderPlaylistSong = useCallback(({ item }: { item: Song }) => (
    <SongRow
      song={item}
      onPress={handlePlaylistSongPress}
      onOptionsPress={handleSongOptionsPress}
    />
  ), [handlePlaylistSongPress, handleSongOptionsPress]);

  const getSongItemLayout = useCallback((_: ArrayLike<Song> | null | undefined, index: number) => ({
    length: 72,
    offset: 72 * index,
    index,
  }), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlist.songs}
        keyExtractor={item => item.id}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverArt} />
            ) : (
              <View style={[styles.coverArtPlaceholder, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="musical-notes" size={48} color={Colors.primary} />
              </View>
            )}
            <MixedText style={[styles.title, { color: colors.text }]}>{playlist.name}</MixedText>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
            </Text>
            {playlist.songs.length > 0 && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.shuffleBtn, { backgroundColor: Colors.primary }]}
                  onPress={() => playQueue(playlist.songs, Math.floor(Math.random() * playlist.songs.length))}
                >
                  <Ionicons name="shuffle" size={18} color="#fff" />
                  <Text style={styles.shuffleBtnText}>Shuffle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.playBtn, { borderColor: Colors.primary }]}
                  onPress={() => playQueue(playlist.songs, 0)}
                >
                  <Ionicons name="play" size={18} color={Colors.primary} />
                  <Text style={[styles.playBtnText, { color: Colors.primary }]}>Play</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        renderItem={renderPlaylistSong}
        getItemLayout={getSongItemLayout}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No songs in this playlist
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 140 }}
      />

      <SongOptionsSheet
        song={selectedSong}
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingVertical: 12 },
  header: { alignItems: 'center', padding: 16 },
  coverArt: { width: 200, height: 200, borderRadius: 16, backgroundColor: '#ddd', marginBottom: 16 },
  coverArtPlaceholder: { width: 200, height: 200, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', textAlign: 'center' },
  meta: { fontSize: 14, marginTop: 6 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  shuffleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  shuffleBtnText: { color: '#fff', fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', fontSize: 15 },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 36, paddingVertical: 11, borderRadius: 24, borderWidth: 1.5 },
  playBtnText: { fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', fontSize: 15 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 15 },
});
