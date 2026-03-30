import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useFonts } from 'expo-font';

import AppNavigator from './src/navigation/AppNavigator';
import { useLibraryStore } from './src/store/libraryStore';
import { useSearchStore } from './src/store/searchStore';
import { useSettingsStore } from './src/store/settingsStore';
import { useTheme } from './src/hooks/useTheme';

const FONT_FAMILY = {
  regular: 'GoogleSans-Regular',
  medium: 'GoogleSans-Medium',
  bold: 'GoogleSans-Bold',
  italic: 'GoogleSans-Italic',
} as const;

function resolveGoogleSansFamily(style: any): string {
  const weight = typeof style?.fontWeight === 'string' ? style.fontWeight : '';
  const isItalic = style?.fontStyle === 'italic';

  if (isItalic) return FONT_FAMILY.italic;
  if (weight === '500') return FONT_FAMILY.medium;
  if (weight === 'bold' || ['600', '700', '800', '900'].includes(weight)) return FONT_FAMILY.bold;
  return FONT_FAMILY.regular;
}

function patchGlobalTextFont() {
  const TextAny = Text as any;
  if (TextAny.__googleSansPatched) return;

  if (typeof TextAny.render === 'function') {
    const originalRender = TextAny.render;
    TextAny.render = function patchedTextRender(this: any, ...args: any[]) {
      const element = originalRender.call(this, ...args);
      const flattened = StyleSheet.flatten(element?.props?.style) ?? {};

      if (flattened.fontFamily) return element;

      const resolvedFamily = resolveGoogleSansFamily(flattened);
      return React.cloneElement(element, {
        style: [
          element.props.style,
          {
            fontFamily: resolvedFamily,
            // Android can ignore custom fonts when a numeric weight is present.
            fontWeight: undefined,
          },
        ],
      });
    };
  } else {
    TextAny.defaultProps = TextAny.defaultProps || {};
    TextAny.defaultProps.style = [{ fontFamily: FONT_FAMILY.regular }, TextAny.defaultProps.style];
  }

  const TextInputAny = TextInput as any;
  TextInputAny.defaultProps = TextInputAny.defaultProps || {};
  TextInputAny.defaultProps.style = [{ fontFamily: FONT_FAMILY.regular }, TextInputAny.defaultProps.style];

  TextAny.__googleSansPatched = true;
}

patchGlobalTextFont();

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
  const [fontsLoaded] = useFonts({
    [FONT_FAMILY.regular]: require('./assets/fonts/GoogleSans-Regular.ttf'),
    [FONT_FAMILY.medium]: require('./assets/fonts/GoogleSans-Medium.ttf'),
    [FONT_FAMILY.bold]: require('./assets/fonts/GoogleSans-Bold.ttf'),
    [FONT_FAMILY.italic]: require('./assets/fonts/GoogleSans-Italic.ttf'),
  });

  const hydrateLibrary = useLibraryStore(s => s.hydrate);
  const hydrateSearch = useSearchStore(s => s.hydrate);
  const hydrateSettings = useSettingsStore(s => s.hydrate);

  useEffect(() => {
    hydrateSettings();
    hydrateLibrary();
    hydrateSearch();
  }, []);

  if (!fontsLoaded) return null;

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
