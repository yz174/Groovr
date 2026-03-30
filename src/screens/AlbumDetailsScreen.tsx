import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { getAlbum, Song, getBestImage, getAlbumArtistNames } from '../api/saavn';
import { usePlayerStore } from '../store/playerStore';
import SongRow from '../components/SongRow';
import SongOptionsSheet from '../components/SongOptionsSheet';
import { HomeStackParamList } from '../navigation/types';

type RoutePropType = RouteProp<HomeStackParamList, 'AlbumDetails'>;
type NavProp = NativeStackNavigationProp<HomeStackParamList>;

export default function AlbumDetailsScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavProp>();
  const { albumId, albumName } = route.params;
  const { colors } = useTheme();
  const { playQueue } = usePlayerStore();

  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);

  useEffect(() => {
    getAlbum(albumId).then(data => {
      setAlbum(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [albumId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const songs: Song[] = Array.isArray(album?.songs) ? album.songs : [];
  const imageUrl = getBestImage(album?.image ?? [], '500x500');
  const artistName = getAlbumArtistNames(album);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8}>
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Album Header */}
        <View style={styles.albumHeader}>
          <Image
            source={{ uri: imageUrl || undefined }}
            style={styles.albumArt}
            defaultSource={require('../../assets/icon.png')}
          />
          <Text style={[styles.albumTitle, { color: colors.text }]}>{album?.name ?? albumName}</Text>
          <Text style={[styles.albumMeta, { color: colors.textSecondary }]}>
            {artistName}
          </Text>
          <Text style={[styles.albumSub, { color: colors.textSecondary }]}>
            {songs.length} Songs  |  {album?.year ?? ''}
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.shuffleBtn, { backgroundColor: Colors.primary }]}
              onPress={() => {
                if (songs.length) {
                  playQueue(songs, Math.floor(Math.random() * songs.length));
                }
              }}
            >
              <Ionicons name="shuffle" size={18} color="#fff" />
              <Text style={styles.shuffleBtnText}>Shuffle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playBtn, { borderColor: Colors.primary }]}
              onPress={() => songs.length && playQueue(songs, 0)}
            >
              <Ionicons name="play" size={18} color={Colors.primary} />
              <Text style={[styles.playBtnText, { color: Colors.primary }]}>Play</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Songs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Songs</Text>
            <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
          </View>
          {songs.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              showIndex={i}
              onPress={(s) => playQueue(songs, songs.findIndex(x => x.id === s.id))}
              onOptionsPress={(s) => { setSelectedSong(s); setOptionsVisible(true); }}
            />
          ))}
        </View>
      </ScrollView>

      <SongOptionsSheet
        song={selectedSong}
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onGoToArtist={(id, name) => navigation.navigate('ArtistDetails', { artistId: id, artistName: name })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  albumHeader: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  albumArt: { width: 220, height: 220, borderRadius: 16, backgroundColor: '#ddd', marginBottom: 20 },
  albumTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  albumMeta: { fontSize: 15, marginTop: 6, textAlign: 'center' },
  albumSub: { fontSize: 13, marginTop: 4 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  shuffleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  shuffleBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 36, paddingVertical: 11, borderRadius: 24, borderWidth: 1.5 },
  playBtnText: { fontWeight: '600', fontSize: 15 },
  section: { marginTop: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
});
