/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#5D4037',
    background: '#FFF5EE', // Seashell
    tint: '#FF7F50', // Coral
    icon: '#8D6E63',
    tabIconDefault: '#8D6E63',
    tabIconSelected: '#FF7F50',
    primary: '#FF7F50',
    secondary: '#FFDAB9', // PeachPuff
    accent: '#B19CD9',
    card: '#FFFFFF',
    border: '#FFE4E1',
    notification: '#FF4500',
    success: '#81C784',
    warning: '#FFB74D',
    error: '#E57373',
  },
  dark: {
    text: '#E0E0E0',
    background: '#121212',
    tint: '#FF7F50',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FF7F50',
    primary: '#FF7F50',
    secondary: '#3E2723',
    accent: '#B19CD9',
    card: '#1E1E1E',
    border: '#333333',
    notification: '#FF4500',
    success: '#388E3C',
    warning: '#F57C00',
    error: '#D32F2F',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
