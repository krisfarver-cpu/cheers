import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { FriendSummary, getHistorySummary, signOut } from '../../lib/api';
import { ago } from '../../lib/format';
import { useTheme, WORDMARK_FONT } from '../../lib/theme';
import { FriendsButton, Header } from '../../components/Header';
import { Avatar } from '../../components/Avatar';

export default function History() {
  const t = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<FriendSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await getHistorySummary()); }
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
        ListHeaderComponent={<Text style={{ color: t.ink, fontSize: 24, fontWeight: '800', marginBottom: 4 }}>History</Text>}
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
          <Pressable onPress={signOut} style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: t.muted, fontWeight: '600' }}>Sign out</Text>
          </Pressable>
        }
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={t.accent}
          onRefresh={() => { setRefreshing(true); load(); }} />}
      />
    </SafeAreaView>
  );
}
