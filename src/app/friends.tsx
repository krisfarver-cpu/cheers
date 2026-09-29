import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { acceptFriendRequest, findByUsername, listFriends, Profile, removeFriend, sendFriendRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Theme, useTheme } from '../lib/theme';
import { Avatar } from '../components/Avatar';
import { PrimaryButton } from '../components/Buttons';

export default function Friends() {
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState<{ friends: Profile[]; incoming: Profile[]; outgoing: Profile[] }>({ friends: [], incoming: [], outgoing: [] });

  const load = useCallback(() => { listFriends().then(setData).catch(() => {}); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function add() {
    const username = query.trim().replace(/^@/, '').toLowerCase();
    if (!username) return;
    if (username === profile?.username) { Alert.alert('That’s you!', 'Enter a friend’s username.'); return; }
    setSearching(true);
    try {
      const found = await findByUsername(username);
      if (!found) { Alert.alert('No one found', `There’s no one with the username @${username}.`); return; }
      await sendFriendRequest(found.id);
      setQuery('');
      Alert.alert('Request sent', `${found.display_name} will see your request next time they open CHEERS!`);
      load();
    } catch (e: any) {
      Alert.alert('Request didn’t send', e.code === '23505' ? 'You already have a request or friendship with this person.' : e.message);
    } finally {
      setSearching(false);
    }
  }

  async function accept(p: Profile) {
    try { await acceptFriendRequest(p.id); load(); }
    catch (e: any) { Alert.alert('That didn’t work', e.message); }
  }

  function confirmRemove(p: Profile, isRequest: boolean) {
    Alert.alert(isRequest ? `Cancel request to ${p.display_name}?` : `Remove ${p.display_name}?`,
      isRequest ? undefined : 'You won’t be able to send each other CHEERS! until you reconnect.',
      [{ text: 'Keep', style: 'cancel' },
       { text: isRequest ? 'Cancel request' : 'Remove', style: 'destructive', onPress: () => removeFriend(p.id).then(load) }]);
  }

  const Row = ({ p, action }: { p: Profile; action: React.ReactNode }) => (
    <View style={s.row}>
      <Avatar profile={p} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{p.display_name}</Text>
        <Text style={s.muted}>@{p.username}</Text>
      </View>
      {action}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.top}>
        <Text style={s.h}>Friends</Text>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" style={s.close}><Text style={{ color: t.ink, fontSize: 18 }}>✕</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        {profile && (
          <Pressable style={s.me} onPress={() => Share.share({ message: `Add me on CHEERS! My username is @${profile.username}` })}>
            <Text style={s.muted}>Your username</Text>
            <Text style={[s.name, { fontSize: 20 }]}>@{profile.username}</Text>
            <Text style={{ color: t.accent, fontWeight: '600', marginTop: 4 }}>Share it with friends</Text>
          </Pressable>
        )}

        <Text style={s.label}>Add a friend</Text>
        <TextInput style={s.input} value={query} onChangeText={setQuery} placeholder="Their username"
          placeholderTextColor={t.muted} autoCapitalize="none" autoCorrect={false} onSubmitEditing={add} returnKeyType="send" />
        <PrimaryButton title="Send friend request" onPress={add} disabled={!query.trim()} loading={searching} />

        {data.incoming.length > 0 && <Text style={s.label}>Requests for you</Text>}
        {data.incoming.map((p) => (
          <Row key={p.id} p={p} action={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => confirmRemove(p, true)} style={s.smallBtn}><Text style={s.muted}>Decline</Text></Pressable>
              <Pressable onPress={() => accept(p)} style={[s.smallBtn, { backgroundColor: t.accent, borderColor: t.accent }]}>
                <Text style={{ color: t.onAccent, fontWeight: '700' }}>Accept</Text>
              </Pressable>
            </View>
          } />
        ))}

        {data.outgoing.length > 0 && <Text style={s.label}>Waiting on them</Text>}
        {data.outgoing.map((p) => (
          <Row key={p.id} p={p} action={
            <Pressable onPress={() => confirmRemove(p, true)} style={s.smallBtn}><Text style={s.muted}>Cancel</Text></Pressable>
          } />
        ))}

        <Text style={s.label}>Your friends</Text>
        {data.friends.length ? data.friends.map((p) => (
          <Row key={p.id} p={p} action={
            <Pressable onPress={() => confirmRemove(p, false)} hitSlop={8}><Text style={s.muted}>Remove</Text></Pressable>
          } />
        )) : <Text style={s.muted}>No friends yet. Add someone by their username above.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  h: { color: t.ink, fontSize: 24, fontWeight: '800' },
  close: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  me: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 20, padding: 16 },
  label: { color: t.ink, fontWeight: '700', fontSize: 16, marginTop: 16 },
  input: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: t.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 18, padding: 12 },
  name: { color: t.ink, fontWeight: '700', fontSize: 16 },
  muted: { color: t.muted, fontSize: 14 },
  smallBtn: { borderWidth: 1.5, borderColor: t.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
