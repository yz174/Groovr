import React, { memo, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Song, getBestImage, getSongArtistNames, formatDuration } from '../api/saavn';
import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { usePlayerStore } from '../store/playerStore';
import MixedText from './MixedText';

interface SongRowProps {
  song: Song;
  onPress?: (song: Song) => void;
  onOptionsPress?: (song: Song) => void;
  showIndex?: number;
  compact?: boolean;
  showMediaButtons?: boolean;
}

const SongRow = memo(({ song, onPress, onOptionsPress, showIndex, compact, showMediaButtons = true }: SongRowProps) => {
  const { colors } = useTheme();
  const isActive = usePlayerStore((state) => state.currentSong()?.id === song.id);
  const isActiveAndPlaying = usePlayerStore((state) => state.isPlaying && state.currentSong()?.id === song.id);

  const imageUrl = getBestImage(song.image, '150x150');
  const artistName = getSongArtistNames(song);
  const duration = formatDuration(song.duration);

  const handlePress = useCallback(() => {
    onPress?.(song);
  }, [onPress, song]);

  const handleOptionsPress = useCallback(() => {
    onOptionsPress?.(song);
  }, [onOptionsPress, song]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, compact && styles.compact]}
      activeOpacity={0.7}
    >
      {showIndex !== undefined && (
        <Text style={[styles.index, { color: isActive ? Colors.primary : colors.textSecondary }]}>
          {isActiveAndPlaying ? '▶' : showIndex + 1}
        </Text>
      )}

      <Image
        source={{ uri: imageUrl || undefined }}
        style={[styles.artwork, isActive && styles.artworkActive]}
        defaultSource={require('../../assets/icon.png')}
      />

      <View style={styles.info}>
        <MixedText
          style={[styles.title, { color: isActive ? Colors.primary : colors.text }]}
          numberOfLines={1}
        >
          {song.name}
        </MixedText>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {artistName}
          {duration ? `  |  ${duration}` : ''}
        </Text>
      </View>

      {showMediaButtons && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handlePress}
            style={[styles.playBtn, { backgroundColor: Colors.primary }]}
            hitSlop={4}
          >
            <Ionicons
              name={isActiveAndPlaying ? 'pause' : 'play'}
              size={14}
              color="#fff"
              style={isActiveAndPlaying ? undefined : { marginLeft: 1 }}
            />
          </TouchableOpacity>

          {onOptionsPress && (
            <TouchableOpacity onPress={handleOptionsPress} hitSlop={8} style={styles.moreBtn}>
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

SongRow.displayName = 'SongRow';
export default SongRow;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 72,
  },
  compact: {
    minHeight: 56,
  },
  index: {
    width: 28,
    fontSize: 14,
    textAlign: 'center',
    marginRight: 4,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  artworkActive: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtn: {
    padding: 4,
  },
});
