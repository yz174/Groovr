import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList, TabParamList, HomeStackParamList, SearchStackParamList, FavoritesStackParamList, PlaylistsStackParamList, SettingsStackParamList } from './types';
import { useTheme } from '../hooks/useTheme';
import { Colors } from '../theme/colors';
import { usePlayerStore } from '../store/playerStore';
import MiniPlayer from '../components/MiniPlayer';

// ─── Screen imports ────────────────────────────────────────────────────────
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ArtistDetailsScreen from '../screens/ArtistDetailsScreen';
import AlbumDetailsScreen from '../screens/AlbumDetailsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import PlaylistDetailsScreen from '../screens/PlaylistDetailsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NowPlayingScreen from '../screens/NowPlayingScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const FavoritesStack = createNativeStackNavigator<FavoritesStackParamList>();
const PlaylistsStack = createNativeStackNavigator<PlaylistsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

// ─── Stack Navigators ──────────────────────────────────────────────────────

function HomeStackNav() {
  const { colors } = useTheme();
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="ArtistDetails" component={ArtistDetailsScreen} />
      <HomeStack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
    </HomeStack.Navigator>
  );
}

function SearchStackNav() {
  const { colors } = useTheme();
  return (
    <SearchStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <SearchStack.Screen name="Search" component={SearchScreen} />
      <SearchStack.Screen name="ArtistDetails" component={ArtistDetailsScreen} />
      <SearchStack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
    </SearchStack.Navigator>
  );
}

function FavoritesStackNav() {
  const { colors } = useTheme();
  return (
    <FavoritesStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <FavoritesStack.Screen name="Favorites" component={FavoritesScreen} />
      <FavoritesStack.Screen name="ArtistDetails" component={ArtistDetailsScreen} />
      <FavoritesStack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
    </FavoritesStack.Navigator>
  );
}

function PlaylistsStackNav() {
  const { colors } = useTheme();
  return (
    <PlaylistsStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <PlaylistsStack.Screen name="Playlists" component={PlaylistsScreen} />
      <PlaylistsStack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
    </PlaylistsStack.Navigator>
  );
}

function SettingsStackNav() {
  const { colors } = useTheme();
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
    </SettingsStack.Navigator>
  );
}

// ─── Tab Layout (with MiniPlayer) ─────────────────────────────────────────

function TabLayout() {
  const { colors, isDark } = useTheme();
  const currentSong = usePlayerStore(s => s.currentSong());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.navBar,
            borderTopColor: colors.separator,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingBottom: 4,
            height: 60,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          tabBarIcon: ({ color, size, focused }) => {
            const icons: Record<string, [string, string]> = {
              HomeTab: ['home', 'home-outline'],
              SearchTab: ['search', 'search-outline'],
              FavoritesTab: ['heart', 'heart-outline'],
              PlaylistsTab: ['list', 'list-outline'],
              SettingsTab: ['settings', 'settings-outline'],
            };
            const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
            return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeStackNav} options={{ title: 'Home' }} />
        <Tab.Screen name="SearchTab" component={SearchStackNav} options={{ title: 'Search' }} />
        <Tab.Screen name="FavoritesTab" component={FavoritesStackNav} options={{ title: 'Favorites' }} />
        <Tab.Screen name="PlaylistsTab" component={PlaylistsStackNav} options={{ title: 'Playlists' }} />
        <Tab.Screen name="SettingsTab" component={SettingsStackNav} options={{ title: 'Settings' }} />
      </Tab.Navigator>
      {currentSong && <MiniPlayer />}
    </View>
  );
}

// ─── Root Navigator ────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { colors, isDark } = useTheme();
  return (
    <NavigationContainer
      theme={{
        ...(isDark ? DarkTheme : DefaultTheme),
        dark: isDark,
        colors: {
          ...(isDark ? DarkTheme : DefaultTheme).colors,
          primary: Colors.primary,
          background: colors.background,
          card: colors.navBar,
          text: colors.text,
          border: colors.separator,
          notification: Colors.primary,
        },
      }}
    >
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={TabLayout} />
        <RootStack.Screen
          name="NowPlaying"
          component={NowPlayingScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
