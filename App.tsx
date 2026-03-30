import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { useLibraryStore } from './src/store/libraryStore';
import { useSearchStore } from './src/store/searchStore';
import { useSettingsStore } from './src/store/settingsStore';
import { useTheme } from './src/hooks/useTheme';

function AppContent() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  const hydrateLibrary = useLibraryStore(s => s.hydrate);
  const hydrateSearch = useSearchStore(s => s.hydrate);
  const hydrateSettings = useSettingsStore(s => s.hydrate);

  useEffect(() => {
    hydrateSettings();
    hydrateLibrary();
    hydrateSearch();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
