import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { createGroup, listFriends, Profile } from '../../lib/api';
import { Theme, useTheme } from '../../lib/theme';
import { Avatar } from '../../components/Avatar';
import { PrimaryButton } from '../../components/Buttons';

export default function NewGroup() {
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const [name, setName] = useState('');
  const [friends, setFriends] = useState<Profile[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { listFriends().then((r) => setFriends(r.friends)).catch(() => {}); }, []));

  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function create() {
    setSaving(true);
    try {
      const id = await createGroup(name, picked);
      router.replace(`/group/${id}`);
    } catch (e: any) {
      Alert.alert('Group wasn’t created', e.message);
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.top}>
        <Text style={s.h}>New group</Text>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" style={s.close}><Text style={{ color: t.ink, fontSize: 18 }}>✕</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Group name</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Friday Crew" placeholderTextColor={t.muted} maxLength={40} autoFocus />

        <Text style={s.label}>Add friends {picked.length ? `(${picked.length})` : ''}</Text>
        {friends.length === 0 && <Text style={s.muted}>Add some friends first, then make a group with them.</Text>}
        {friends.map((f) => {
          const on = picked.includes(f.id);
          return (
            <Pressable key={f.id} onPress={() => toggle(f.id)} style={[s.row, on && { borderColor: t.accent, borderWidth: 2 }]}
              accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Avatar profile={f} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{f.display_name}</Text>
                <Text style={s.muted}>@{f.username}</Text>
              </View>
              <View style={[s.check, on && { backgroundColor: t.accent, borderColor: t.accent }]}>
                {on && <Text style={{ color: t.onAccent, fontWeight: '800' }}>✓</Text>}
              </View>
            </Pressable>
          );
        })}

        <PrimaryButton title="Create group" onPress={create} disabled={!name.trim() || !picked.length} loading={saving} style={{ marginTop: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  h: { color: t.ink, fontSize: 24, fontWeight: '800' },
  close: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  label: { color: t.ink, fontWeight: '700', fontSize: 16, marginTop: 8 },
  input: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: t.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 18, padding: 12 },
  name: { color: t.ink, fontWeight: '700', fontSize: 16 },
  muted: { color: t.muted, fontSize: 14 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: t.line, alignItems: 'center', justifyContent: 'center' },
});
