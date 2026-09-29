import { useColorScheme } from 'react-native';

const light = {
  bg: '#E7F2E2', surface: '#F6FBF3', ink: '#0E1A12', muted: '#4A6147',
  accent: '#3F9B74', onAccent: '#FFFFFF', amber: '#F7B32B', line: '#CFE2C8',
};
const dark: typeof light = {
  bg: '#0F1A13', surface: '#1A2A1F', ink: '#E7F2E2', muted: '#A7C3A3',
  accent: '#5CC097', onAccent: '#0F1A13', amber: '#F7B32B', line: '#2A3F30',
};

export type Theme = typeof light;
export const useTheme = (): Theme => (useColorScheme() === 'dark' ? dark : light);

export const WORDMARK_FONT = 'Shrikhand_400Regular';

const AVATAR_COLORS = ['#F7B32B', '#7CC4F0', '#B99BF2', '#6DD3A0', '#FF9F80', '#F28DB2'];
export function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
