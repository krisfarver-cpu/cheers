import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Cheers } from '../lib/api';
import { ago } from '../lib/format';
import { useTheme } from '../lib/theme';

function statusText(c: Cheers) {
  if (!c.opened_at) return 'New CHEERS!';
  const parts = [];
  if (c.liked_at) parts.push('♥ Liked');
  if (c.cheered_back_at) parts.push('🥂 Cheered back');
  return parts.join('   ') || 'Opened';
}

export function CheersCard({ cheers, photoUrl, onPress }: { cheers: Cheers; photoUrl?: string; onPress: () => void }) {
  const t = useTheme();
  const unread = !cheers.opened_at;
  const name = cheers.sender?.display_name ?? 'A friend';
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${unread ? 'New ' : ''}CHEERS! from ${name}`}
      style={({ pressed }) => ({
        flexDirection: 'row', gap: 14, alignItems: 'center', padding: 10, borderRadius: 20,
        backgroundColor: t.surface, borderWidth: unread ? 2 : 1, borderColor: unread ? t.accent : t.line,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Image source={photoUrl} style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: t.line }} contentFit="cover" transition={150} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: t.ink, fontWeight: '700', fontSize: 16 }}>{name}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>{ago(cheers.created_at)}</Text>
        </View>
        {cheers.location_name ? <Text numberOfLines={1} style={{ color: t.ink, fontSize: 14 }}>📍 {cheers.location_name}</Text> : null}
        <Text style={{ color: unread ? t.accent : t.muted, fontSize: 13, fontWeight: unread ? '700' : '400' }}>{statusText(cheers)}</Text>
      </View>
    </Pressable>
  );
}
