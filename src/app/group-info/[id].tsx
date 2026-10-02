import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { addGroupMembers, getGroup, Group, leaveGroup, listFriends, Profile, removeGroupMember, renameGroup } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Theme, useTheme } from '../../lib/theme';
import { Avatar } from '../../components/Avatar';
import { SecondaryButton } from '../../components/Buttons';

export default function GroupInfo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user.id;
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    try {
      const [g, f] = await Promise.all([getGroup(id), listFriends()]);
      setGroup(g); setName(g.name); setFriends(f.friends);
    } catch (e: any) { Alert.alert('Couldn’t load the group', e.message); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!group) return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} />;

  const isCreator = group.created_by === me;
  const memberIds = new Set(group.members.map((m) => m.id));
  const addable = friends.filter((f) => !memberIds.has(f.id));

  async function saveName() {
    if (!name.trim() || name.trim() === group!.name) return;
    try { await renameGroup(id, name); load(); } catch (e: any) { Alert.alert('Name didn’t save', e.message); }
  }

  async function add(p: Profile) {
    try { await addGroupMembers(id, [p.id]); load(); }
    catch (e: any) { Alert.alert('Couldn’t add them', e.message); }
  }

  function remove(p: Profile) {
    Alert.alert(`Remove ${p.display_name} from ${group!.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeGroupMember(id, p.id).then(load).catch((e) => Alert.alert('That didn’t work', e.message)) },
    ]);
  }

  function leave() {
    Alert.alert(`Leave ${group!.name}?`, 'You’ll stop seeing its CHEERS! and won’t get its notifications. Someone in the group can add you back.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave group', style: 'destructive', onPress: async () => {
        try { await leaveGroup(id); router.dismissTo('/history'); }
        catch (e: any) { Alert.alert('That didn’t work', e.message); }
      } },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.top}>
        <Text style={s.h}>Group info</Text>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" style={s.close}><Text style={{ color: t.ink, fontSize: 18 }}>✕</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Name</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} onEndEditing={saveName} onSubmitEditing={saveName}
          maxLength={40} returnKeyType="done" />

        <Text style={s.label}>Members ({group.members.length})</Text>
        {group.members.map((m) => (
          <View key={m.id} style={s.row}>
            <Avatar profile={m} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{m.id === me ? 'You' : m.display_name}{m.id === group.created_by ? '  · started the group' : ''}</Text>
              <Text style={s.muted}>@{m.username}</Text>
            </View>
            {isCreator && m.id !== me && (
              <Pressable onPress={() => remove(m)} hitSlop={8}><Text style={s.muted}>Remove</Text></Pressable>
            )}
          </View>
        ))}

        {addable.length > 0 && <Text style={s.label}>Add friends</Text>}
        {addable.map((f) => (
          <View key={f.id} style={s.row}>
            <Avatar profile={f} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{f.display_name}</Text>
              <Text style={s.muted}>@{f.username}</Text>
            </View>
            <Pressable onPress={() => add(f)} style={[s.smallBtn, { backgroundColor: t.accent, borderColor: t.accent }]}>
              <Text style={{ color: t.onAccent, fontWeight: '700' }}>Add</Text>
            </Pressable>
          </View>
        ))}

        <SecondaryButton title="Leave group" onPress={leave} style={{ marginTop: 24, borderColor: '#D64545' }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  h: { color: t.ink, fontSize: 24, fontWeight: '800' },
  close: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  label: { color: t.ink, fontWeight: '700', fontSize: 16, marginTop: 12 },
  input: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: t.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 18, padding: 12 },
  name: { color: t.ink, fontWeight: '700', fontSize: 16 },
  muted: { color: t.muted, fontSize: 14 },
  smallBtn: { borderWidth: 1.5, borderColor: t.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
});
