import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { getArtist, getArtistSongs, getArtistAlbums, Artist, Song, Album, getBestImage, searchArtists, isSingleArtistCandidate } from '../api/saavn';
import { usePlayerStore } from '../store/playerStore';
import SongRow from '../components/SongRow';
import AlbumCard from '../components/AlbumCard';
import SongOptionsSheet from '../components/SongOptionsSheet';
import { HomeStackParamList } from '../navigation/types';

type RoutePropType = RouteProp<HomeStackParamList, 'ArtistDetails'>;
type NavProp = NativeStackNavigationProp<HomeStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ArtistDetailsScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavProp>();
  const { artistId, artistName } = route.params;
  const { colors } = useTheme();
  const { playQueue } = usePlayerStore();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let artistData: Artist | null = null;
        let resolvedArtistId = artistId;

        try {
          artistData = await getArtist(artistId);
          resolvedArtistId = artistData?.id ?? artistId;
        } catch {
          // Fallback: if a composite or stale ID fails, resolve a valid single artist by name.
          const candidates = await searchArtists(artistName, 10);
          const fallback = candidates.find((a) => isSingleArtistCandidate(a)) ?? candidates[0];
          if (!fallback?.id) throw new Error('No valid fallback artist found');
          artistData = await getArtist(fallback.id);
          resolvedArtistId = artistData?.id ?? fallback.id;
        }

        setArtist(artistData);

        const [songsResult, albumsResult] = await Promise.allSettled([
          getArtistSongs(resolvedArtistId),
          getArtistAlbums(resolvedArtistId),
        ]);

        if (songsResult.status === 'fulfilled') {
          setSongs((songsResult.value ?? []).slice(0, 20));
        } else {
          setSongs([]);
        }

        if (albumsResult.status === 'fulfilled') {
          setAlbums((albumsResult.value ?? []).slice(0, 10));
        } else {
          setAlbums([]);
        }
      } catch (err) {
        console.error('Failed to load artist:', err);
        setArtist(null);
        setSongs([]);
        setAlbums([]);
      }
      setLoading(false);
    }
    load();
  }, [artistId]);

  const imageUrl = getBestImage(artist?.image ?? [], '500x500');

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Back + Options */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Artist Header */}
        <View style={styles.artistHeader}>
          <Image
            source={{ uri: imageUrl || undefined }}
            style={styles.artistAvatar}
            defaultSource={require('../../assets/icon.png')}
          />
          <Text style={[styles.artistName, { color: colors.text }]}>{artist?.name ?? artistName}</Text>
          <Text style={[styles.artistMeta, { color: colors.textSecondary }]}>
            {albums.length} Album{albums.length !== 1 ? 's' : ''}  |  {songs.length} Songs
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.shuffleBtn, { backgroundColor: Colors.primary }]}
              onPress={() => {
                if (songs.length) {
                  const idx = Math.floor(Math.random() * songs.length);
                  playQueue(songs, idx);
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
        {songs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Songs</Text>
              <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
            </View>
            {songs.slice(0, 6).map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                showIndex={i}
                onPress={(s) => playQueue(songs, songs.findIndex(x => x.id === s.id))}
                onOptionsPress={(s) => { setSelectedSong(s); setOptionsVisible(true); }}
              />
            ))}
          </View>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Albums</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
              {albums.map(album => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  size={140}
                  onPress={(a) => navigation.navigate('AlbumDetails', { albumId: a.id, albumName: a.name })}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <SongOptionsSheet
        song={selectedSong}
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onGoToAlbum={(id, name) => navigation.navigate('AlbumDetails', { albumId: id, albumName: name })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  artistHeader: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  artistAvatar: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#ddd', marginBottom: 16 },
  artistName: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  artistMeta: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  shuffleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  shuffleBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 36, paddingVertical: 11, borderRadius: 24, borderWidth: 1.5, backgroundColor: 'transparent' },
  playBtnText: { fontWeight: '600', fontSize: 15 },
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
});
