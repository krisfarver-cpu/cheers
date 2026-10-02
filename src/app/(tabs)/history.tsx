import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { FriendSummary, getHistorySummary, Group, listGroups } from '../../lib/api';
import { ago } from '../../lib/format';
import { useTheme, WORDMARK_FONT } from '../../lib/theme';
import { FriendsButton, Header } from '../../components/Header';
import { Avatar } from '../../components/Avatar';

export default function History() {
  const t = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<FriendSummary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, g] = await Promise.all([getHistorySummary(), listGroups().catch(() => [] as Group[])]);
      setRows(r); setGroups(g);
    }
    catch (e: any) { console.warn(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <Header right={<FriendsButton onPress={() => router.push('/friends')} />} />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.friend.id}
        contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: t.ink, fontSize: 24, fontWeight: '800' }}>Groups</Text>
              <Pressable onPress={() => router.push('/group/new')} hitSlop={8}
                style={{ borderWidth: 1.5, borderColor: t.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text style={{ color: t.accent, fontWeight: '700' }}>+ New group</Text>
              </Pressable>
            </View>
            {groups.length === 0 ? (
              <Text style={{ color: t.muted, fontSize: 15 }}>Start a group like “Friday Crew” and share drinks with everyone at once.</Text>
            ) : groups.map((g) => (
              <Pressable key={g.id} onPress={() => router.push(`/group/${g.id}`)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20,
                  backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, opacity: pressed ? 0.85 : 1,
                })}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>🍻</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.ink, fontWeight: g.unread ? '800' : '700', fontSize: 16 }} numberOfLines={1}>{g.name}</Text>
                  <Text style={{ color: t.muted, fontSize: 14 }} numberOfLines={1}>
                    {g.members.length} {g.members.length === 1 ? 'member' : 'members'}{g.lastAt ? ` · last CHEERS! ${ago(g.lastAt)}` : ''}
                  </Text>
                </View>
                {g.unread > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel={`${g.unread} new`}>
                    <Text style={{ color: t.accent, fontWeight: '800', fontSize: 13 }}>{g.unread > 9 ? '9+' : g.unread} new</Text>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.accent }} />
                  </View>
                ) : (
                  <Text style={{ color: t.muted, fontSize: 18 }}>›</Text>
                )}
              </Pressable>
            ))}
            <Text style={{ color: t.ink, fontSize: 24, fontWeight: '800', marginTop: 16 }}>Friends</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/thread/${item.friend.id}`)}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20,
              backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, opacity: pressed ? 0.85 : 1,
            })}>
            <Avatar profile={item.friend} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.ink, fontWeight: '700', fontSize: 16 }}>You and {item.friend.display_name}</Text>
              <Text style={{ color: t.muted, fontSize: 14 }}>
                {item.lastAt ? `Last CHEERS! ${ago(item.lastAt)}` : 'No CHEERS! yet'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: WORDMARK_FONT, fontSize: 26, color: t.accent }}>{item.total}</Text>
              <Text style={{ color: t.muted, fontSize: 12 }}>CHEERS!</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
          <Text style={{ color: t.muted, fontSize: 16, paddingTop: 32 }}>
            Your CHEERS! with each friend will add up here. Add a friend to get started.
          </Text>
        )}
        ListFooterComponent={
          <Pressable onPress={() => router.push('/account')} style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: t.muted, fontWeight: '600' }}>Account and settings</Text>
          </Pressable>
        }
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={t.accent}
          onRefresh={() => { setRefreshing(true); load(); }} />}
      />
    </SafeAreaView>
  );
}
