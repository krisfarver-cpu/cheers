import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Cheers, getProfile, getThread, Profile } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fullDate } from '../../lib/format';
import { usePhotoUrls } from '../../lib/usePhotoUrls';
import { useTheme } from '../../lib/theme';
import { Avatar } from '../../components/Avatar';

export default function Thread() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { session } = useAuth();
  const me = session?.user.id;
  const t = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [friend, setFriend] = useState<Profile | null>(null);
  const [items, setItems] = useState<Cheers[]>([]);

  useFocusEffect(useCallback(() => {
    getProfile(friendId).then(setFriend).catch(() => {});
    getThread(friendId).then(setItems).catch(() => {});
  }, [friendId]));

  useLayoutEffect(() => {
    navigation.setOptions({ title: friend ? `You and ${friend.display_name}` : '' });
  }, [friend]);

  const photo = usePhotoUrls(items.map((i) => i.photo_path));
  const sent = items.filter((i) => i.sender_id === me).length;
  const backs = items.filter((i) => i.cheered_back_at).length;

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 20, gap: 12 }}
      ListHeaderComponent={friend ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <Avatar profile={friend} size={56} />
          <Text style={{ color: t.muted, fontSize: 15, flex: 1 }}>
            {sent} sent, {items.length - sent} received, {backs} cheered back
          </Text>
        </View>
      ) : null}
      ListEmptyComponent={
        <Text style={{ color: t.muted, fontSize: 16 }}>No CHEERS! with {friend?.display_name ?? 'this friend'} yet. Send the first one.</Text>
      }
      renderItem={({ item }) => {
        const mine = item.sender_id === me;
        const who = mine ? friend?.display_name : 'You';
        const reactions = [item.liked_at && `${who} liked it`, item.cheered_back_at && `${who} cheered back`].filter(Boolean);
        return (
          <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
            <Pressable onPress={() => router.push(`/cheers/${item.id}`)}
              style={{
                width: '78%', padding: 8, gap: 6, borderWidth: 1, borderColor: t.line,
                backgroundColor: mine ? `${t.accent}1F` : t.surface,
                borderRadius: 20, borderBottomRightRadius: mine ? 6 : 20, borderBottomLeftRadius: mine ? 20 : 6,
              }}>
              <Image source={photo(item.photo_path)} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: t.line }} contentFit="cover" />
              <View style={{ paddingHorizontal: 4 }}>
                {item.location_name ? <Text style={{ color: t.ink, fontSize: 14 }}>📍 {item.location_name}</Text> : null}
                <Text style={{ color: t.muted, fontSize: 13 }}>{mine ? 'You sent' : `${friend?.display_name ?? ''} sent`}, {fullDate(item.created_at)}</Text>
                {reactions.length ? (
                  <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13, marginTop: 2 }}>
                    {item.cheered_back_at ? '🥂' : '♥'} {reactions.join(', ')}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </View>
        );
      }}
    />
  );
}
