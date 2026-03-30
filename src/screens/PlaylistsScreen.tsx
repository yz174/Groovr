import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { useLibraryStore, Playlist } from '../store/libraryStore';
import { getBestImage } from '../api/saavn';
import { PlaylistsStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<PlaylistsStackParamList>;

export default function PlaylistsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();
  const { playlists, createPlaylist, deletePlaylist } = useLibraryStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    createPlaylist(newName.trim());
    setNewName('');
    setShowCreate(false);
  };

  const handleDelete = (playlist: Playlist) => {
    Alert.alert('Delete Playlist', `Delete "${playlist.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(playlist.id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <View style={styles.logoRow}>
          <Ionicons name="musical-notes" size={28} color={Colors.primary} />
          <Text style={[styles.logoText, { color: colors.text }]}>Groovr</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCreate(true)} hitSlop={8}>
          <Ionicons name="add" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {playlists.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="list-outline" size={72} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Playlists Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Create a playlist to organize your music
          </Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: Colors.primary }]}
            onPress={() => setShowCreate(true)}
          >
            <Text style={styles.createBtnText}>Create Playlist</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.playlistRow, { borderBottomColor: colors.separator }]}
              onPress={() => navigation.navigate('PlaylistDetails', { playlistId: item.id })}
              activeOpacity={0.7}
            >
              {item.coverImage ? (
                <Image source={{ uri: item.coverImage }} style={styles.playlistImage} />
              ) : (
                <View style={[styles.playlistImagePlaceholder, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="musical-notes" size={24} color={Colors.primary} />
                </View>
              )}
              <View style={styles.playlistInfo}>
                <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.playlistMeta, { color: colors.textSecondary }]}>
                  {item.songs.length} song{item.songs.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 140 }}
        />
      )}

      {/* Create Playlist Modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Playlist</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Playlist name"
              placeholderTextColor={colors.textSecondary}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.separator, backgroundColor: colors.surface }]}
              autoFocus
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setShowCreate(false); setNewName(''); }} style={styles.modalCancel}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                style={[styles.modalCreate, { backgroundColor: Colors.primary, opacity: newName.trim() ? 1 : 0.5 }]}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', marginTop: 16 },
  emptySubtitle: { fontSize: 15, marginTop: 8, textAlign: 'center' },
  createBtn: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  createBtnText: { color: '#fff', fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', fontSize: 15 },
  playlistRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  playlistImage: { width: 56, height: 56, borderRadius: 8 },
  playlistImagePlaceholder: { width: 56, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  playlistInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  playlistName: { fontSize: 15, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  playlistMeta: { fontSize: 12, marginTop: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '80%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalCancelText: { fontSize: 15 },
  modalCreate: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  modalCreateText: { color: '#fff', fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', fontSize: 15 },
});
