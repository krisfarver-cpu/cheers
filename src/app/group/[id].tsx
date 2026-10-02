import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { blockUser, getGroup, getGroupFeed, Group, GroupPost, markGroupRead, setGroupReaction, subscribeToGroup } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { ago } from '../../lib/format';
import { usePhotoUrls } from '../../lib/usePhotoUrls';
import { Theme, useTheme } from '../../lib/theme';
import { Avatar } from '../../components/Avatar';
import { PrimaryButton } from '../../components/Buttons';
import { ClinkAnimation } from '../../components/ClinkAnimation';

export default function GroupThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user.id;
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const navigation = useNavigation();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clink, setClink] = useState(0);

  const load = useCallback(async () => {
    try {
      const [g, feed] = await Promise.all([getGroup(id), getGroupFeed(id)]);
      setGroup(g); setPosts(feed);
      markGroupRead(id).catch(() => {});
    } catch (e: any) {
      Alert.alert('Couldn’t open this group', e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => subscribeToGroup(id, load), [id, load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: group?.name ?? '',
      headerRight: () => (
        <Pressable onPress={() => router.push(`/group-info/${id}`)} hitSlop={10} accessibilityLabel="Group info">
          <Text style={{ color: t.accent, fontWeight: '700', fontSize: 16 }}>Info</Text>
        </Pressable>
      ),
    });
  }, [group?.name, id]);

  const photo = usePhotoUrls(posts.map((p) => p.photo_path));

  async function react(p: GroupPost, kind: 'like' | 'cheers') {
    const mine = p.group_reactions.some((r) => r.user_id === me && r.kind === kind);
    // Update the screen right away, then save
    setPosts((cur) => cur.map((x) => x.id !== p.id ? x : {
      ...x,
      group_reactions: mine
        ? x.group_reactions.filter((r) => !(r.user_id === me && r.kind === kind))
        : [...x.group_reactions, { user_id: me!, kind }],
    }));
    if (kind === 'cheers' && !mine) setClink((n) => n + 1);
    try { await setGroupReaction(p.id, kind, !mine); }
    catch (e: any) { load(); Alert.alert('That didn’t save', e.message); }
  }

  function sendDrink(replyTo?: string) {
    router.navigate({ pathname: '/send', params: { toGroup: id, ...(replyTo ? { replyTo, replyToGroup: id } : {}) } });
  }

  function postMenu(p: GroupPost) {
    const name = p.sender?.display_name ?? 'this person';
    Alert.alert(name, undefined, [
      { text: 'Report this CHEERS!', onPress: () => router.push({ pathname: '/report', params: { userId: p.sender_id, cheersId: p.id, photoPath: p.photo_path, name } }) },
      {
        text: `Block ${name}`, style: 'destructive', onPress: () => Alert.alert(`Block ${name}?`,
          'You won’t see their CHEERS! anywhere, including in groups, and they can’t send you friend requests. They won’t be notified.',
          [{ text: 'Cancel', style: 'cancel' },
           { text: 'Block', style: 'destructive', onPress: () => blockUser(p.sender_id).then(load).catch((e) => Alert.alert('Block didn’t work', e.message)) }]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (loading) return <View style={[s.fill, { justifyContent: 'center' }]}><ActivityIndicator /></View>;

  return (
    <View style={s.fill}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={t.accent} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={group ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {group.members.slice(0, 6).map((m) => <Avatar key={m.id} profile={m} size={28} />)}
            <Text style={[s.muted, { marginLeft: 6 }]}>{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</Text>
          </View>
        ) : null}
        ListEmptyComponent={<Text style={[s.muted, { fontSize: 16, paddingTop: 24 }]}>No drinks yet. Be the first to send one to {group?.name ?? 'the group'}.</Text>}
        renderItem={({ item: p }) => {
          const mine = p.sender_id === me;
          const likes = p.group_reactions.filter((r) => r.kind === 'like');
          const cheers = p.group_reactions.filter((r) => r.kind === 'cheers');
          const iLiked = likes.some((r) => r.user_id === me);
          const iCheered = cheers.some((r) => r.user_id === me);
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                {p.sender && <Avatar profile={p.sender} size={36} />}
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{mine ? 'You' : p.sender?.display_name}</Text>
                  <Text style={s.muted}>{ago(p.created_at)}{p.reply_to_id ? '  ·  ↩︎ CHEERS! back' : ''}</Text>
                </View>
                {!mine && (
                  <Pressable onPress={() => postMenu(p)} hitSlop={10} accessibilityLabel="Report or block">
                    <Text style={{ color: t.muted, fontSize: 18, fontWeight: '800' }}>•••</Text>
                  </Pressable>
                )}
              </View>
              <View style={s.photo}>
                <Image source={photo(p.photo_path)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                {p.location_name ? <View style={s.loc}><Text style={s.locText} numberOfLines={1}>📍 {p.location_name}</Text></View> : null}
              </View>
              <View style={s.actions}>
                <Pressable onPress={() => react(p, 'like')} style={[s.pill, iLiked && s.pillOn]} accessibilityState={{ selected: iLiked }}>
                  <Text style={[s.pillText, iLiked && { color: t.accent }]}>{iLiked ? '♥' : '♡'} {likes.length || ''}</Text>
                </Pressable>
                <Pressable onPress={() => react(p, 'cheers')} style={[s.pill, iCheered && s.pillOn]} disabled={mine} accessibilityState={{ selected: iCheered }}>
                  <Text style={[s.pillText, iCheered && { color: t.accent }]}>🥂 {cheers.length || (mine ? '' : 'CHEERS!')}</Text>
                </Pressable>
                {!mine && (
                  <Pressable onPress={() => sendDrink(p.id)} style={s.pill}>
                    <Text style={s.pillText}>📸 Drink back</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />
      <View style={s.bottom}>
        <PrimaryButton title={`📸 Send a drink to ${group?.name ?? 'the group'}`} onPress={() => sendDrink()} />
      </View>
      <ClinkAnimation trigger={clink} />
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: t.bg },
  muted: { color: t.muted, fontSize: 13 },
  name: { color: t.ink, fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 22, padding: 12, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  photo: { aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: t.line },
  loc: { position: 'absolute', left: 10, bottom: 10, right: 10, alignItems: 'flex-start' },
  locText: { backgroundColor: 'rgba(255,255,255,0.92)', color: '#0E1A12', fontWeight: '600', fontSize: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { borderWidth: 1.5, borderColor: t.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillOn: { borderColor: t.accent },
  pillText: { color: t.ink, fontWeight: '700', fontSize: 14 },
  bottom: { position: 'absolute', left: 20, right: 20, bottom: 28 },
});
