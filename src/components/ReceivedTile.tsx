import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Cheers } from '../lib/api';
import { ago } from '../lib/format';
import { useTheme } from '../lib/theme';
import { DrinkTag } from './DrinkTag';

/** Photo-grid tile for the Received tab in partner apps. */
export function ReceivedTile({ cheers, photoUrl, onPress }: { cheers: Cheers; photoUrl?: string; onPress: () => void }) {
  const t = useTheme();
  const unread = !cheers.opened_at;
  const name = cheers.sender?.display_name ?? 'A friend';
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${unread ? 'New ' : ''}CHEERS! from ${name}`} style={{ width: '48%', gap: 6 }}>
      <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: unread ? 3 : 1, borderColor: unread ? t.accent : t.line }}>
        <Image source={photoUrl} style={{ width: '100%', aspectRatio: 1, backgroundColor: t.surface }} contentFit="cover" transition={150} />
        <View style={{ position: 'absolute', left: 6, bottom: 6, right: 6 }}>
          <DrinkTag category={cheers.drink_category} brand={cheers.drink_brand} onPhoto />
        </View>
        {unread && (
          <Text style={{ position: 'absolute', top: 6, right: 6, backgroundColor: t.accent, color: '#FFFFFF', fontSize: 10, fontWeight: '800', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 }}>
            NEW
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
        <Text style={{ color: t.ink, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{name}</Text>
        <Text style={{ color: t.muted, fontSize: 12 }}>{ago(cheers.created_at)}</Text>
      </View>
    </Pressable>
  );
}
