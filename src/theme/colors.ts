export const Colors = {
  primary: '#FF8C00',
  primaryLight: '#FFF3E0',
  primaryDark: '#E65100',

  // Light theme
  light: {
    background: '#FFFFFF',
    surface: '#F8F8F8',
    surfaceElevated: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    separator: '#E5E5EA',
    tabInactive: '#8E8E93',
    icon: '#3C3C43',
    overlay: 'rgba(0,0,0,0.4)',
    bottomSheet: '#FFFFFF',
    searchBar: '#F2F2F7',
    navBar: '#FFFFFF',
  },

  // Dark theme
  dark: {
    background: '#1C1C1E',
    surface: '#2C2C2E',
    surfaceElevated: '#3A3A3C',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#48484A',
    separator: '#38383A',
    tabInactive: '#8E8E93',
    icon: '#EBEBF5',
    overlay: 'rgba(0,0,0,0.6)',
    bottomSheet: '#2C2C2E',
    searchBar: '#1C1C1E',
    navBar: '#1C1C1E',
  },
};

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;
