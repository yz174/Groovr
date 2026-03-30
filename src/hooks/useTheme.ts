import { useColorScheme } from 'react-native';
import { Colors, ThemeColors } from '../theme/colors';
import { useSettingsStore } from '../store/settingsStore';

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const systemScheme = useColorScheme();
  const themeSetting = useSettingsStore(s => s.theme);

  const isDark =
    themeSetting === 'dark' ? true :
    themeSetting === 'light' ? false :
    systemScheme === 'dark';

  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
  };
}
