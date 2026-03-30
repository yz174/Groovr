import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Artist, getBestImage } from '../api/saavn';
import { useTheme } from '../hooks/useTheme';

interface ArtistCardProps {
  artist: Artist;
  onPress?: (artist: Artist) => void;
  size?: number;
}

const ArtistCard = memo(({ artist, onPress, size = 110 }: ArtistCardProps) => {
  const { colors } = useTheme();
  const imageUrl = getBestImage(artist.image ?? [], '500x500');

  return (
    <TouchableOpacity
      style={[styles.container, { width: size + 16 }]}
      onPress={() => onPress?.(artist)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: imageUrl || undefined }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        defaultSource={require('../../assets/icon.png')}
      />
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2} textBreakStrategy="simple">
        {artist.name}
      </Text>
    </TouchableOpacity>
  );
});

ArtistCard.displayName = 'ArtistCard';
export default ArtistCard;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: '#e0e0e0',
  },
  name: {
    fontSize: 13,
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
});
