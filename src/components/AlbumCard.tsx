import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Album, getBestImage } from '../api/saavn';
import { useTheme } from '../hooks/useTheme';

interface AlbumCardProps {
  album: Album;
  onPress?: (album: Album) => void;
  onOptionsPress?: (album: Album) => void;
  size?: number;
  horizontal?: boolean;
}

const AlbumCard = memo(({ album, onPress, onOptionsPress, size = 160, horizontal = false }: AlbumCardProps) => {
  const { colors } = useTheme();
  const imageUrl = getBestImage(album.image, '500x500');
  const artistName = album.primaryArtists ?? album.artists?.map(a => a.name).join(', ') ?? '';

  if (horizontal) {
    return (
      <TouchableOpacity
        style={[styles.horizontal, { borderBottomColor: colors.separator }]}
        onPress={() => onPress?.(album)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: imageUrl || undefined }}
          style={styles.horizontalImage}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.horizontalInfo}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{album.name}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {artistName}{album.year ? `  |  ${album.year}` : ''}
          </Text>
          {album.songCount != null && (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {album.songCount} songs
            </Text>
          )}
        </View>
        {onOptionsPress && (
          <TouchableOpacity onPress={() => onOptionsPress(album)} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { width: size }]}
      onPress={() => onPress?.(album)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: imageUrl || undefined }}
        style={[styles.image, { width: size, height: size }]}
        defaultSource={require('../../assets/icon.png')}
      />
      <View style={styles.cardInfo}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{album.name}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {artistName}
          {album.year ? `  ·  ${album.year}` : ''}
        </Text>
      </View>
      {onOptionsPress && (
        <TouchableOpacity
          onPress={() => onOptionsPress(album)}
          hitSlop={8}
          style={styles.optionsBtn}
        >
          <Ionicons name="ellipsis-vertical" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

AlbumCard.displayName = 'AlbumCard';
export default AlbumCard;

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  image: {
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  cardInfo: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  optionsBtn: {
    position: 'absolute',
    right: 4,
    bottom: 48,
    padding: 4,
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  horizontalImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  horizontalInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
});
