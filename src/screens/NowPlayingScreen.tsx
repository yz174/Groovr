import React, { useCallback } from 'react';
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

  if (!currentSong) {
    navigation.goBack();
    return null;
  }

  const imageUrl = getBestImage(currentSong.image, '500x500');
  const artistName = getSongArtistNames(currentSong);
  const isFav = isFavorite(currentSong.id);

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
        <TouchableOpacity hitSlop={8}>
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
          value={position}
          maximumValue={duration || 1}
          onSlidingComplete={seekTo}
        />
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatDuration(Math.floor(position / 1000))}
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
            name={isLoading ? 'hourglass' : isPlaying ? 'pause' : 'play'}
            size={28}
            color="#fff"
            style={isPlaying ? undefined : { marginLeft: 3 }}
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

      {/* Lyrics stub */}
      <TouchableOpacity style={styles.lyricsBtn}>
        <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
        <Text style={[styles.lyricsText, { color: colors.textSecondary }]}>Lyrics</Text>
      </TouchableOpacity>
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
  lyricsBtn: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 16,
    gap: 2,
  },
  lyricsText: { fontSize: 13, fontWeight: '500' },
});
