import { ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { Avatar } from './Avatar';
import { BRAND } from '../lib/brand';
import { useTheme, WORDMARK_FONT } from '../lib/theme';

/** Your avatar, top right on every tab. Opens Account and settings. */
function AccountButton() {
  const t = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  return (
    <Pressable onPress={() => router.push('/account')} accessibilityRole="button" accessibilityLabel="Account and settings" hitSlop={8}
      style={{ borderRadius: 999, borderWidth: 2, borderColor: t.line }}>
      {profile ? <Avatar profile={profile} size={34} /> : (
        <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface }}>
          <Text>⚙️</Text>
        </View>
      )}
    </Pressable>
  );
}

function RightSide({ right }: { right?: ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{right}<AccountButton /></View>;
}

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
        <RightSide right={right} />
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
      <Text accessibilityRole="header" style={{ fontFamily: WORDMARK_FONT, fontSize: 30, color: t.accent, transform: [{ rotate: '-3deg' }] }}>
        CHEERS!
      </Text>
      <RightSide right={right} />
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
