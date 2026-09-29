import { ActivityIndicator, Pressable, Text, ViewStyle } from 'react-native';
import { useTheme } from '../lib/theme';

export function PrimaryButton({ title, onPress, disabled, loading, style }: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean; style?: ViewStyle;
}) {
  const t = useTheme();
  const off = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={off} accessibilityRole="button" accessibilityState={{ disabled: off }}
      style={({ pressed }) => [{
        backgroundColor: t.accent, borderRadius: 999, paddingVertical: 16, paddingHorizontal: 20,
        alignItems: 'center', opacity: off ? 0.45 : pressed ? 0.85 : 1,
      }, style]}>
      {loading ? <ActivityIndicator color={t.onAccent} /> :
        <Text style={{ color: t.onAccent, fontWeight: '800', fontSize: 17 }}>{title}</Text>}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, left }: {
  label: string; selected?: boolean; onPress: () => void; left?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!selected }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 999,
        paddingHorizontal: 12, paddingVertical: 7,
        borderColor: selected ? t.accent : t.line, backgroundColor: selected ? t.accent : t.surface,
      }}>
      {left}
      <Text style={{ color: selected ? t.onAccent : t.ink, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}
