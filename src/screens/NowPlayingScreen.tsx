import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProgressSlider from '../components/ProgressSlider';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { getBestImage, getSongArtistNames, formatDuration } from '../api/saavn';
import SongOptionsSheet from '../components/SongOptionsSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH - 64;

export default function NowPlayingScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const {
    isPlaying, isLoading, position, duration,
    shuffleMode, repeatMode,
    togglePlay, seekTo, skipNext, skipPrevious,
    toggleShuffle, toggleRepeat,
  } = usePlayerStore();
  const currentSong = usePlayerStore(s => s.currentSong());
  const { toggleFavorite, isFavorite } = useLibraryStore();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);

  if (!currentSong) {
    navigation.goBack();
    return null;
  }

  const imageUrl = getBestImage(currentSong.image, '500x500');
  const artistName = getSongArtistNames(currentSong);
  const isFav = isFavorite(currentSong.id);
  const displayPosition = scrubPosition ?? position;

  const progressPercent = duration > 0 ? position / duration : 0;

  const repeatIcon = repeatMode === 'one' ? 'repeat-outline' : 'repeat';
  const repeatColor = repeatMode !== 'none' ? Colors.primary : colors.textSecondary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={[styles.topBarLabel, { color: colors.textSecondary }]}>Now Playing</Text>
        </View>
        <TouchableOpacity hitSlop={8} onPress={() => setOptionsVisible(true)}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Artwork */}
      <View style={styles.artworkContainer}>
        <Image
          source={{ uri: imageUrl || undefined }}
          style={[styles.artwork, { shadowColor: isDark ? '#000' : '#888' }]}
          defaultSource={require('../../assets/icon.png')}
        />
      </View>

      <View style={styles.bottomControls}>
        {/* Song Info + Heart */}
        <View style={styles.infoRow}>
          <View style={styles.infoText}>
            <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>
              {currentSong.name}
            </Text>
            <Text style={[styles.artistName, { color: colors.textSecondary }]} numberOfLines={1}>
              {artistName}
            </Text>
          </View>
          <TouchableOpacity onPress={() => toggleFavorite(currentSong)} hitSlop={8}>
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={26}
              color={isFav ? Colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <ProgressSlider
            value={displayPosition}
            maximumValue={duration || 1}
            onValueChange={setScrubPosition}
            onSlidingComplete={async (value) => {
              setScrubPosition(value);
              await seekTo(value);
              setScrubPosition(null);
            }}
          />
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}> 
              {formatDuration(Math.floor(displayPosition / 1000))}
            </Text>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}> 
              {formatDuration(Math.floor(duration / 1000))}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Shuffle */}
          <TouchableOpacity onPress={toggleShuffle} hitSlop={8}>
            <Ionicons
              name="shuffle"
              size={24}
              color={shuffleMode ? Colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Prev */}
          <TouchableOpacity onPress={skipPrevious} hitSlop={8}>
            <Ionicons name="play-skip-back" size={32} color={colors.text} />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity
            onPress={togglePlay}
            style={[styles.playBtn, { backgroundColor: Colors.primary }]}
          >
            <Ionicons
              name={isPlaying || isLoading ? 'pause' : 'play'}
              size={28}
              color="#fff"
              style={isPlaying || isLoading ? undefined : { marginLeft: 3 }}
            />
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity onPress={skipNext} hitSlop={8}>
            <Ionicons name="play-skip-forward" size={32} color={colors.text} />
          </TouchableOpacity>

          {/* Repeat */}
          <TouchableOpacity onPress={toggleRepeat} hitSlop={8} style={{ position: 'relative' }}>
            <Ionicons name={repeatIcon} size={24} color={repeatColor} />
            {repeatMode === 'one' && (
              <View style={[styles.repeatOneBadge, { backgroundColor: Colors.primary }]}> 
                <Text style={styles.repeatOneText}>1</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <SongOptionsSheet
        song={currentSong}
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onGoToArtist={(artistId, artistName) => {
          setOptionsVisible(false);
          navigation.goBack();
          setTimeout(() => {
            (navigation as any).navigate('Main', {
              screen: 'HomeTab',
              params: { screen: 'ArtistDetails', params: { artistId, artistName } },
            });
          }, 0);
        }}
        onGoToAlbum={(albumId, albumName) => {
          setOptionsVisible(false);
          navigation.goBack();
          setTimeout(() => {
            (navigation as any).navigate('Main', {
              screen: 'HomeTab',
              params: { screen: 'AlbumDetails', params: { albumId, albumName } },
            });
          }, 0);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarLabel: { fontSize: 14, fontWeight: '500' },
  artworkContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 28,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 20,
    backgroundColor: '#ddd',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  bottomControls: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  infoText: { flex: 1, marginRight: 16 },
  songTitle: { fontSize: 22, fontWeight: '700' },
  artistName: { fontSize: 16, marginTop: 4 },
  progressContainer: { paddingHorizontal: 24 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
  timeText: { fontSize: 12 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 24,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  repeatOneBadge: {
    position: 'absolute',
    right: -6,
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneText: { fontSize: 8, color: '#fff', fontWeight: '700' },
});
