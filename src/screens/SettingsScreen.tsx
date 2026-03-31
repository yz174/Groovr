import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { useSettingsStore } from '../store/settingsStore';
import { checkAndApplyOtaUpdate, isOtaSupported } from '../services/otaUpdates';

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

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { theme, setTheme } = useSettingsStore();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [otaStatus, setOtaStatus] = useState('Idle');

  const otaSupported = isOtaSupported();

  const selectedThemeLabel = useMemo(() => {
    if (theme === 'light') return 'Light';
    if (theme === 'dark') return 'Dark';
    return 'System Default';
  }, [theme]);

  const pickTheme = (value: 'light' | 'dark') => {
    setTheme(value);
    setThemeMenuOpen(false);
  };

  const handleCheckForUpdates = async () => {
    if (!otaSupported || checkingUpdates) return;

    setCheckingUpdates(true);
    setOtaStatus('Checking...');

    const result = await checkAndApplyOtaUpdate();

    if (result.status === 'upToDate') {
      setOtaStatus('Up to date');
      Alert.alert('No updates found', 'You are already on the latest version.');
    } else if (result.status === 'applied') {
      setOtaStatus('Update applied');
    } else if (result.status === 'unsupported') {
      setOtaStatus('Unavailable in development');
      Alert.alert('Not available', 'OTA updates are available only in production/dev-client builds.');
    } else {
      setOtaStatus('Update failed');
      Alert.alert('Update failed', result.message);
    }

    setCheckingUpdates(false);
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
          <View style={styles.themeMenuAnchor}>
            <SettingRow
              icon="color-palette-outline"
              label="Theme"
              value={selectedThemeLabel}
              onPress={() => setThemeMenuOpen(v => !v)}
              right={<Ionicons name={themeMenuOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />}
              colors={colors}
            />
            {themeMenuOpen && (
              <View style={[styles.themeMenuOverlay, { borderColor: colors.separator, backgroundColor: colors.surfaceElevated ?? colors.surface }]}> 
                <TouchableOpacity style={styles.themeOption} onPress={() => pickTheme('light')}>
                  <View style={[styles.themeOptionCircle, { borderColor: Colors.primary }]}>
                    {theme === 'light' && <View style={[styles.themeOptionCircleInner, { backgroundColor: Colors.primary }]} />}
                  </View>
                  <Text style={[styles.themeOptionText, { color: colors.text }]}>Light</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.themeOption, { borderTopColor: colors.separator }]} onPress={() => pickTheme('dark')}>
                  <View style={[styles.themeOptionCircle, { borderColor: Colors.primary }]}>
                    {theme === 'dark' && <View style={[styles.themeOptionCircleInner, { backgroundColor: Colors.primary }]} />}
                  </View>
                  <Text style={[styles.themeOptionText, { color: colors.text }]}>Dark</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Updates */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Updates</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}> 
          <SettingRow
            icon="cloud-download-outline"
            label="Check for updates"
            value={otaSupported ? otaStatus : 'Build app to enable OTA'}
            onPress={otaSupported ? handleCheckForUpdates : undefined}
            right={
              checkingUpdates
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : undefined
            }
            colors={colors}
          />
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  sectionLabel: { fontSize: 13, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  card: { marginHorizontal: 16, borderRadius: 12, overflow: 'visible' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  settingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal' },
  settingValue: { fontSize: 13, marginTop: 2 },
  themeMenuAnchor: {
    position: 'relative',
    zIndex: 20,
  },
  themeMenuOverlay: {
    position: 'absolute',
    top: 46,
    right: 8,
    width: 132,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  themeOptionCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionCircleInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themeOptionText: {
    fontSize: 14,
    fontFamily: 'Flamante-Roma-Medium',
    fontWeight: 'normal',
  },
});
