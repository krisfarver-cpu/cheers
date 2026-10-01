import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { deleteAccount, getDiscoverable, setDiscoverable, signOut } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '../lib/config';
import { Theme, useTheme } from '../lib/theme';
import { Avatar } from '../components/Avatar';

export default function Account() {
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const { profile } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [discoverable, setDisc] = useState(true);

  useEffect(() => { getDiscoverable().then(setDisc).catch(() => {}); }, []);

  async function toggleDiscoverable(on: boolean) {
    setDisc(on);
    try { await setDiscoverable(on); }
    catch (e: any) { setDisc(!on); Alert.alert('That didn’t save', e.message); }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, your friends list, and every CHEERS! you’ve sent or received, including photos. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account', style: 'destructive', onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount(); // signing out sends you back to the sign-in screen
            } catch (e: any) {
              setDeleting(false);
              Alert.alert('Your account wasn’t deleted', `${e.message}\n\nTry again, or email ${SUPPORT_EMAIL}.`);
            }
          },
        },
      ],
    );
  }

  const Row = ({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <Text style={[s.rowText, danger && { color: '#D64545', fontWeight: '700' }]}>{label}</Text>
      {!danger && <Text style={{ color: t.muted, fontSize: 18 }}>›</Text>}
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.top}>
        <Text style={s.h}>Account</Text>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" style={s.close}>
          <Text style={{ color: t.ink, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
        {profile && (
          <View style={s.me}>
            <Avatar profile={profile} size={52} />
            <View>
              <Text style={{ color: t.ink, fontWeight: '800', fontSize: 18 }}>{profile.display_name}</Text>
              <Text style={{ color: t.muted, fontSize: 15 }}>@{profile.username}</Text>
            </View>
          </View>
        )}

        <Text style={s.label}>Privacy</Text>
        <View style={[s.row, { gap: 12 }]}>
          <Text style={[s.rowText, { flex: 1 }]}>Let people find me from their contacts</Text>
          <Switch value={discoverable} onValueChange={toggleDiscoverable} trackColor={{ true: t.accent }} />
        </View>

        <Text style={s.label}>Help and legal</Text>
        <Row label="Terms of use" onPress={() => Linking.openURL(TERMS_URL)} />
        <Row label="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
        <Row label="Contact support" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />

        <Text style={s.label}>Account</Text>
        <Row label="Sign out" onPress={signOut} />
        {deleting ? <ActivityIndicator style={{ padding: 16 }} /> : <Row label="Delete account" onPress={confirmDelete} danger />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  h: { color: t.ink, fontSize: 24, fontWeight: '800' },
  close: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  me: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 20, padding: 16 },
  label: { color: t.muted, fontWeight: '700', fontSize: 14, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15 },
  rowText: { color: t.ink, fontSize: 16 },
});
