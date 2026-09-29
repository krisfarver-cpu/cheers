import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  acceptFriendRequest, blockUser, findByUsername, listBlocked, listFriends,
  Profile, removeFriend, sendFriendRequest, unblockUser,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { Theme, useTheme } from '../lib/theme';
import { Avatar } from '../components/Avatar';
import { PrimaryButton } from '../components/Buttons';

type Lists = { friends: Profile[]; incoming: Profile[]; outgoing: Profile[]; blocked: Profile[] };

export default function Friends() {
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState<Lists>({ friends: [], incoming: [], outgoing: [], blocked: [] });

  const load = useCallback(() => {
    Promise.all([listFriends(), listBlocked()])
      .then(([f, blocked]) => setData({ ...f, blocked }))
      .catch(() => {});
  }, []);
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
      Alert.alert('Request didn’t send', e.code === '23505'
        ? 'You already have a request or friendship with this person.'
        : 'You can’t send a request to this person.');
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

  function confirmBlock(p: Profile) {
    Alert.alert(`Block ${p.display_name}?`,
      'They won’t be able to send you CHEERS! or friend requests, and their CHEERS! will be hidden from you. They won’t be notified.',
      [{ text: 'Cancel', style: 'cancel' },
       { text: 'Block', style: 'destructive', onPress: () => blockUser(p.id).then(load).catch((e) => Alert.alert('Block didn’t work', e.message)) }]);
  }

  function decline(p: Profile) {
    Alert.alert(`Decline ${p.display_name}’s request?`, undefined, [
      { text: 'Decline', onPress: () => removeFriend(p.id).then(load) },
      { text: 'Decline and block', style: 'destructive', onPress: () => confirmBlock(p) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function manage(p: Profile) {
    Alert.alert(p.display_name, `@${p.username}`, [
      { text: 'Remove friend', onPress: () => confirmRemove(p, false) },
      { text: `Block ${p.display_name}`, style: 'destructive', onPress: () => confirmBlock(p) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function unblock(p: Profile) {
    Alert.alert(`Unblock ${p.display_name}?`, 'They’ll be able to send you friend requests again. You’d need to reconnect as friends to swap CHEERS!',
      [{ text: 'Cancel', style: 'cancel' },
       { text: 'Unblock', onPress: () => unblockUser(p.id).then(load) }]);
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
              <Pressable onPress={() => decline(p)} style={s.smallBtn}><Text style={s.muted}>Decline</Text></Pressable>
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
            <Pressable onPress={() => manage(p)} hitSlop={10} accessibilityLabel={`Options for ${p.display_name}`} style={s.more}>
              <Text style={{ color: t.muted, fontSize: 20, fontWeight: '800' }}>•••</Text>
            </Pressable>
          } />
        )) : <Text style={s.muted}>No friends yet. Add someone by their username above.</Text>}

        {data.blocked.length > 0 && <Text style={s.label}>Blocked</Text>}
        {data.blocked.map((p) => (
          <Row key={p.id} p={p} action={
            <Pressable onPress={() => unblock(p)} style={s.smallBtn}><Text style={s.muted}>Unblock</Text></Pressable>
          } />
        ))}
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
  more: { paddingHorizontal: 6, paddingVertical: 4 },
});
