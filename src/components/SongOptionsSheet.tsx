import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
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
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);

  const { playNext, addToQueue, setBlockingOverlayVisible } = usePlayerStore();
  const { toggleFavorite, isFavorite, downloadSong, deleteDownload, isDownloaded, playlists, addToPlaylist } = useLibraryStore();
  const downloadProgress = usePlayerStore(s => song ? s.downloadProgress[song.id] : undefined);

  useEffect(() => {
    setBlockingOverlayVisible(visible || playlistPickerVisible);
    return () => setBlockingOverlayVisible(false);
  }, [visible, playlistPickerVisible, setBlockingOverlayVisible]);

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

  const handleAddToPlaylist = () => {
    if (playlists.length === 0) {
      Alert.alert('No Playlists', 'No playlist exists yet. Create one in the Playlists tab first.');
      return;
    }
    setSelectedPlaylistIds([]);
    setPlaylistPickerVisible(true);
  };

  const togglePlaylistSelection = (playlistId: string) => {
    setSelectedPlaylistIds((prev) =>
      prev.includes(playlistId)
        ? prev.filter((id) => id !== playlistId)
        : [...prev, playlistId]
    );
  };

  const handleAddSelectedPlaylists = () => {
    if (selectedPlaylistIds.length === 0) {
      Alert.alert('Select Playlist', 'Choose at least one playlist to add this song.');
      return;
    }

    const selectedPlaylists = playlists.filter((p) => selectedPlaylistIds.includes(p.id));
    const alreadyInPlaylists = selectedPlaylists.filter((p) => p.songs.some((s) => s.id === song.id));
    const playlistsToAdd = selectedPlaylists.filter((p) => !p.songs.some((s) => s.id === song.id));

    playlistsToAdd.forEach((playlist) => {
      addToPlaylist(playlist.id, song);
    });

    if (playlistsToAdd.length > 0 && alreadyInPlaylists.length > 0) {
      Alert.alert(
        'Playlist Update',
        `Added to ${playlistsToAdd.length} playlist${playlistsToAdd.length !== 1 ? 's' : ''}. Already present in ${alreadyInPlaylists.length} playlist${alreadyInPlaylists.length !== 1 ? 's' : ''}.`
      );
    } else if (playlistsToAdd.length > 0) {
      Alert.alert(
        'Added to Playlist',
        `"${song.name}" was added to ${playlistsToAdd.length} playlist${playlistsToAdd.length !== 1 ? 's' : ''}.`
      );
    } else {
      Alert.alert('Already Added', `"${song.name}" is already in all selected playlists.`);
    }

    setPlaylistPickerVisible(false);
    setSelectedPlaylistIds([]);
    handleClose();
  };

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
      onPress: () => {
        onAddToPlaylist?.(song);
        handleAddToPlaylist();
      },
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
    <>
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

      <Modal
        visible={playlistPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPlaylistPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.playlistOverlay}
          activeOpacity={1}
          onPress={() => setPlaylistPickerVisible(false)}
        >
          <View style={[styles.playlistModal, { backgroundColor: colors.surfaceElevated }]}> 
            <Text style={[styles.playlistTitle, { color: colors.text }]}>Add To Playlist</Text>
            <ScrollView>
              {playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={[styles.playlistItem, { borderBottomColor: colors.separator }]}
                    onPress={() => togglePlaylistSelection(playlist.id)}
                >
                    <Ionicons
                      name={selectedPlaylistIds.includes(playlist.id) ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selectedPlaylistIds.includes(playlist.id) ? Colors.primary : colors.textSecondary}
                      style={styles.playlistCheckbox}
                    />
                    <View style={styles.playlistInfo}>
                  <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>
                    {playlist.name}
                  </Text>
                  <Text style={[styles.playlistMeta, { color: colors.textSecondary }]}> 
                    {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
                  </Text>
                    </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
              <TouchableOpacity
                style={[
                  styles.playlistConfirm,
                  { backgroundColor: selectedPlaylistIds.length > 0 ? Colors.primary : colors.separator },
                ]}
                onPress={handleAddSelectedPlaylists}
                disabled={selectedPlaylistIds.length === 0}
              >
                <Text style={styles.playlistConfirmText}>
                  Add to Selected ({selectedPlaylistIds.length})
                </Text>
              </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playlistCancel, { borderColor: colors.separator }]}
                onPress={() => {
                  setSelectedPlaylistIds([]);
                  setPlaylistPickerVisible(false);
                }}
            >
              <Text style={[styles.playlistCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
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
    fontFamily: 'Flamante-Round-Book-FFP',
    fontWeight: 'normal',
  },
  playlistOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  playlistModal: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
    paddingTop: 12,
  },
  playlistTitle: {
    fontSize: 17,
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playlistCheckbox: {
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 15,
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
  },
  playlistMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  playlistConfirm: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  playlistConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
  },
  playlistCancel: {
    margin: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  playlistCancelText: {
    fontSize: 14,
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
  },
});
