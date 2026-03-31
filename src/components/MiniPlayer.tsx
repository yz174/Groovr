import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { usePlayerStore } from '../store/playerStore';
import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { getBestImage, getSongArtistNames } from '../api/saavn';
import { RootStackParamList } from '../navigation/types';
import MixedText from './MixedText';

type NavProp = NativeStackNavigationProp<RootStackParamList>
// Keep in sync with tabBarStyle.height in AppNavigator
export const TAB_BAR_HEIGHT = 78;
export const MINI_PLAYER_HEIGHT = 64;

export default function MiniPlayer() {
  const navigation = useNavigation<NavProp>();
  const { colors, isDark } = useTheme();
  const { isPlaying, isLoading, togglePlay, skipNext, skipPrevious } = usePlayerStore();
  const currentSong = usePlayerStore(s => s.currentSong());
  const isBlockingOverlayVisible = usePlayerStore(s => s.isBlockingOverlayVisible);
  const insets = useSafeAreaInsets();

  if (!currentSong || isBlockingOverlayVisible) return null;

  const imageUrl = getBestImage(currentSong.image, '150x150');
  const artistName = getSongArtistNames(currentSong);

  return (
    <Pressable
      onPress={() => navigation.navigate('NowPlaying')}
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.separator,
          bottom: insets.bottom + TAB_BAR_HEIGHT + 8,
          shadowColor: isDark ? '#000' : '#888',
        },
      ]}
    >
      {/* Album Art */}
      <Image
        source={{ uri: imageUrl || undefined }}
        style={styles.artwork}
        defaultSource={require('../../assets/icon.png')}
      />

      {/* Song Info */}
      <View style={styles.info}>
        <MixedText style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {currentSong.name}
        </MixedText>
        <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
          {artistName}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); skipPrevious(); }} hitSlop={8}>
          <Ionicons name="play-skip-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); togglePlay(); }}
          style={[styles.playBtn, { backgroundColor: Colors.primary }]}
          hitSlop={4}
        >
          <Ionicons
            name={isPlaying || isLoading ? 'pause' : 'play'}
            size={18}
            color="#fff"
            style={isPlaying || isLoading ? undefined : { marginLeft: 2 }}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={(e) => { e.stopPropagation(); skipNext(); }} hitSlop={8}>
          <Ionicons name="play-skip-forward" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 64,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
    borderTopWidth: 0,
    zIndex: 99,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  info: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
  },
  artist: {
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
