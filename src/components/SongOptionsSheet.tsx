import React, { useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import { Song, getBestImage, getSongArtistNames, formatDuration } from '../api/saavn';
import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';

interface SongOptionsSheetProps {
  song: Song | null;
  visible: boolean;
  onClose: () => void;
  onGoToArtist?: (artistId: string, artistName: string) => void;
  onGoToAlbum?: (albumId: string, albumName: string) => void;
  onAddToPlaylist?: (song: Song) => void;
}

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  loading?: boolean;
}

export default function SongOptionsSheet({
  song,
  visible,
  onClose,
  onGoToArtist,
  onGoToAlbum,
  onAddToPlaylist,
}: SongOptionsSheetProps) {
  const { colors, isDark } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['65%'], []);

  const { playNext, addToQueue } = usePlayerStore();
  const { toggleFavorite, isFavorite, downloadSong, deleteDownload, isDownloaded } = useLibraryStore();
  const downloadProgress = usePlayerStore(s => song ? s.downloadProgress[song.id] : undefined);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    onClose();
  }, [onClose]);

  if (!song || !visible) return null;

  const imageUrl = getBestImage(song.image, '150x150');
  const artistName = getSongArtistNames(song);
  const duration = formatDuration(song.duration);
  const isFav = isFavorite(song.id);
  const downloaded = isDownloaded(song.id);
  const isDownloading = downloadProgress != null && downloadProgress < 1;

  const primaryArtist = song.artists?.primary?.[0];

  const menuItems: MenuItem[] = [
    {
      icon: 'play-forward',
      label: 'Play Next',
      onPress: () => { playNext(song); handleClose(); },
    },
    {
      icon: 'add-circle-outline',
      label: 'Add to Playing Queue',
      onPress: () => { addToQueue(song); handleClose(); },
    },
    {
      icon: isFav ? 'heart' : 'heart-outline',
      label: isFav ? 'Remove from Favorites' : 'Add to Favorites',
      onPress: () => { toggleFavorite(song); handleClose(); },
      color: isFav ? Colors.primary : undefined,
    },
    {
      icon: 'list-outline',
      label: 'Add to Playlist',
      onPress: () => { onAddToPlaylist?.(song); handleClose(); },
    },
    ...(song.album?.id ? [{
      icon: 'disc-outline',
      label: 'Go to Album',
      onPress: () => {
        onGoToAlbum?.(song.album.id, song.album.name);
        handleClose();
      },
    }] : []),
    ...(primaryArtist ? [{
      icon: 'person-outline',
      label: 'Go to Artist',
      onPress: () => {
        onGoToArtist?.(primaryArtist.id, primaryArtist.name);
        handleClose();
      },
    }] : []),
    {
      icon: downloaded ? 'cloud-done' : isDownloading ? 'cloud-download' : 'download-outline',
      label: downloaded
        ? 'Remove Download'
        : isDownloading
        ? `Downloading... ${Math.round((downloadProgress ?? 0) * 100)}%`
        : 'Download',
      onPress: () => {
        if (downloaded) {
          Alert.alert('Delete Download', 'Remove this song from device?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => { deleteDownload(song.id); handleClose(); } },
          ]);
        } else if (!isDownloading) {
          downloadSong(song).catch(err =>
            Alert.alert('Download Failed', err.message)
          );
          handleClose();
        }
      },
      loading: isDownloading,
      color: downloaded ? Colors.primary : undefined,
    },
    {
      icon: 'share-outline',
      label: 'Share',
      onPress: () => handleClose(),
    },
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.bottomSheet, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.separator, width: 36 }}
      backdropComponent={() => (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          activeOpacity={1}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
        </TouchableOpacity>
      )}
    >
      {/* Song Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Image
          source={{ uri: imageUrl || undefined }}
          style={styles.headerImage}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {song.name}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {artistName}  |  {duration}
          </Text>
        </View>
        <TouchableOpacity onPress={() => toggleFavorite(song)} hitSlop={8}>
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={22}
            color={isFav ? Colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <BottomSheetScrollView>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, { borderBottomColor: colors.separator }]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            {item.loading ? (
              <ActivityIndicator size={20} color={Colors.primary} style={styles.menuIcon} />
            ) : (
              <Ionicons
                name={item.icon as any}
                size={20}
                color={item.color ?? colors.icon}
                style={styles.menuIcon}
              />
            )}
            <Text style={[styles.menuLabel, { color: item.color ?? colors.text }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 32 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  headerImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    width: 28,
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
});
