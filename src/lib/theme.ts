import { useColorScheme } from 'react-native';
import { IS_IB } from './brand';

const light = {
  bg: '#E7F2E2', surface: '#F6FBF3', ink: '#0E1A12', muted: '#4A6147',
  accent: '#3F9B74', onAccent: '#FFFFFF', amber: '#F7B32B', line: '#CFE2C8',
  secondary: '#3F9B74', band: null as string | null, onBand: '#FFFFFF',
  tabBg: '#F6FBF3', tabFg: '#0E1A12', tabFgInactive: '#4A6147',
};
const dark: typeof light = {
  bg: '#0F1A13', surface: '#1A2A1F', ink: '#E7F2E2', muted: '#A7C3A3',
  accent: '#5CC097', onAccent: '#0F1A13', amber: '#F7B32B', line: '#2A3F30',
  secondary: '#5CC097', band: null, onBand: '#FFFFFF',
  tabBg: '#1A2A1F', tabFg: '#E7F2E2', tabFgInactive: '#A7C3A3',
};

// Indiana Beverage, Option B: white screens, red header bands, blue tab bar
const indianaBev: typeof light = {
  bg: '#0B2347', surface: 'rgba(255,255,255,0.07)', ink: '#F4F6FA', muted: '#B4C3D8',
  accent: '#DA2128', onAccent: '#FFFFFF', amber: '#F7B32B', line: 'rgba(255,255,255,0.16)',
  secondary: '#6FB1F0', band: null, onBand: '#FFFFFF',
  tabBg: '#081B38', tabFg: '#FFFFFF', tabFgInactive: '#B4C3D8',
};

export type Theme = typeof light;
export const useTheme = (): Theme => {
  const scheme = useColorScheme();
  if (IS_IB) return indianaBev;
  return scheme === 'dark' ? dark : light;
};

export const WORDMARK_FONT = 'Shrikhand_400Regular';

const AVATAR_COLORS = ['#F7B32B', '#7CC4F0', '#B99BF2', '#6DD3A0', '#FF9F80', '#F28DB2'];
export function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
