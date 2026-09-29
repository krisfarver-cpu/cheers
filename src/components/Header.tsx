import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme, WORDMARK_FONT } from '../lib/theme';

export function Header({ right }: { right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
      <Text accessibilityRole="header" style={{ fontFamily: WORDMARK_FONT, fontSize: 30, color: t.accent, transform: [{ rotate: '-3deg' }] }}>
        CHEERS!
      </Text>
      {right}
    </View>
  );
}

export function FriendsButton({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel="Friends" hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text>👥</Text>
      <Text style={{ color: t.ink, fontWeight: '600' }}>Friends</Text>
    </Pressable>
  );
}
