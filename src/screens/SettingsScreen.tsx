import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { useSettingsStore, AudioQuality } from '../store/settingsStore';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  colors: any;
}

function SettingRow({ icon, label, value, onPress, right, colors }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: colors.separator }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: Colors.primaryLight }]}>
        <Ionicons name={icon as any} size={18} color={Colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
        {value && <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />)}
    </TouchableOpacity>
  );
}

const QUALITY_OPTIONS: AudioQuality[] = ['96kbps', '160kbps', '320kbps'];

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const {
    theme, setTheme,
    audioQuality, setAudioQuality,
    downloadQuality, setDownloadQuality,
    streamOverCellular, setStreamOverCellular,
    downloadOverCellular, setDownloadOverCellular,
  } = useSettingsStore();
  const { downloads, deleteDownload } = useLibraryStore();

  const totalDownloadSize = downloads.reduce((acc, d) => acc + (d.size ?? 0), 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClearDownloads = () => {
    Alert.alert('Clear Downloads', `Delete all ${downloads.length} downloaded songs?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: () => downloads.forEach(d => deleteDownload(d.song.id)),
      },
    ]);
  };

  const handleTheme = () => {
    const options: Array<SettingsState['theme']> = ['system', 'light', 'dark'];
    const idx = options.indexOf(theme);
    setTheme(options[(idx + 1) % options.length]);
  };

  const handleQuality = () => {
    const idx = QUALITY_OPTIONS.indexOf(audioQuality);
    setAudioQuality(QUALITY_OPTIONS[(idx + 1) % QUALITY_OPTIONS.length]);
  };

  const handleDownloadQuality = () => {
    const idx = QUALITY_OPTIONS.indexOf(downloadQuality);
    setDownloadQuality(QUALITY_OPTIONS[(idx + 1) % QUALITY_OPTIONS.length]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <View style={styles.logoRow}>
          <Ionicons name="musical-notes" size={28} color={Colors.primary} />
          <Text style={[styles.logoText, { color: colors.text }]}>Groovr</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <SettingRow
            icon="color-palette-outline"
            label="Theme"
            value={theme === 'system' ? 'System Default' : theme === 'light' ? 'Light' : 'Dark'}
            onPress={handleTheme}
            colors={colors}
          />
        </View>

        {/* Playback */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Playback</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <SettingRow
            icon="musical-note-outline"
            label="Streaming Quality"
            value={audioQuality}
            onPress={handleQuality}
            colors={colors}
          />
          <SettingRow
            icon="cellular-outline"
            label="Stream Over Cellular"
            colors={colors}
            right={
              <Switch
                value={streamOverCellular}
                onValueChange={setStreamOverCellular}
                trackColor={{ false: colors.separator, true: Colors.primaryLight }}
                thumbColor={streamOverCellular ? Colors.primary : colors.textSecondary}
              />
            }
          />
        </View>

        {/* Downloads */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Downloads</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <SettingRow
            icon="download-outline"
            label="Download Quality"
            value={downloadQuality}
            onPress={handleDownloadQuality}
            colors={colors}
          />
          <SettingRow
            icon="cellular-outline"
            label="Download Over Cellular"
            colors={colors}
            right={
              <Switch
                value={downloadOverCellular}
                onValueChange={setDownloadOverCellular}
                trackColor={{ false: colors.separator, true: Colors.primaryLight }}
                thumbColor={downloadOverCellular ? Colors.primary : colors.textSecondary}
              />
            }
          />
          <SettingRow
            icon="folder-outline"
            label="Downloaded Songs"
            value={`${downloads.length} songs  ·  ${formatSize(totalDownloadSize)}`}
            colors={colors}
          />
          {downloads.length > 0 && (
            <SettingRow
              icon="trash-outline"
              label="Clear All Downloads"
              onPress={handleClearDownloads}
              colors={colors}
              right={<Ionicons name="chevron-forward" size={18} color={Colors.primary} />}
            />
          )}
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <SettingRow icon="information-circle-outline" label="Version" value="1.0.0" colors={colors} />
          <SettingRow icon="musical-notes-outline" label="Powered by JioSaavn" value="saavn.sumit.co" colors={colors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Need to import type for handleTheme
type SettingsState = { theme: 'system' | 'light' | 'dark' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  sectionLabel: { fontSize: 13, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  card: { marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  settingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  settingValue: { fontSize: 13, marginTop: 2 },
});
