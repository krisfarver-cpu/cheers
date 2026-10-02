import { Text } from 'react-native';
import { useTheme } from '../lib/theme';

/** Shows "IPA · Brand" when a CHEERS! was tagged. */
export function DrinkTag({ category, brand, onPhoto }: { category?: string | null; brand?: string | null; onPhoto?: boolean }) {
  const t = useTheme();
  const label = [category, brand].filter(Boolean).join(' · ');
  if (!label) return null;
  return (
    <Text numberOfLines={1} style={{
      alignSelf: 'flex-start', fontSize: 12, fontWeight: '700', overflow: 'hidden', borderRadius: 999,
      paddingHorizontal: 9, paddingVertical: 3,
      color: onPhoto ? '#FFFFFF' : t.secondary,
      backgroundColor: onPhoto ? 'rgba(11,35,71,0.75)' : t.surface,
    }}>
      🏷 {label}
    </Text>
  );
}
