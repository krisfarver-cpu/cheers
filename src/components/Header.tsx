import { ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { BRAND } from '../lib/brand';
import { useTheme, WORDMARK_FONT } from '../lib/theme';

export function Header({ right }: { right?: ReactNode }) {
  const t = useTheme();
  if (BRAND) {
    return (
      <View style={{ backgroundColor: t.band ?? 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text accessibilityRole="header" style={{ fontFamily: WORDMARK_FONT, fontSize: 28, color: t.band ? t.onBand : t.accent, transform: [{ rotate: '-3deg' }] }}>
            CHEERS!
          </Text>
          <View style={{ backgroundColor: t.band ? '#FFFFFF' : 'transparent', borderRadius: 6, padding: 3 }}>
            <Image source={BRAND.logo} accessibilityLabel={BRAND.partnerName} style={{ width: 52, height: 32 }} resizeMode="contain" />
          </View>
        </View>
        {right}
      </View>
    );
  }
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
