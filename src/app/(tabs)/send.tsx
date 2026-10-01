import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { cheersBack, listFriends, Profile, sendCheers } from '../../lib/api';
import { suggestPlaceName } from '../../lib/location';
import { useAuth } from '../../lib/auth';
import { inviteMessage, shareCheersPhoto } from '../../lib/share';
import { Theme, useTheme } from '../../lib/theme';
import { Header } from '../../components/Header';
import { Chip, PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { Avatar } from '../../components/Avatar';
import { ClinkAnimation } from '../../components/ClinkAnimation';

type Photo = { uri: string; mimeType?: string | null };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
  // Converts iPhone HEIC photos to JPEG so Android friends can see them
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

export default function Send() {
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const { profile } = useAuth();
  // Set when someone taps "Send a drink back" on a CHEERS! they received
  const { replyTo, replyToUser } = useLocalSearchParams<{ replyTo?: string; replyToUser?: string }>();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [to, setTo] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [clink, setClink] = useState(0);
  const [sentNote, setSentNote] = useState('');
  const [lastSent, setLastSent] = useState<{ uri: string; location: string } | null>(null);
  const [sharing, setSharing] = useState(false);

  useFocusEffect(useCallback(() => {
    listFriends().then((r) => setFriends(r.friends)).catch(() => {});
  }, []));

  useEffect(() => {
    if (replyTo && replyToUser) setTo([replyToUser]);
  }, [replyTo, replyToUser]);

  const replyName = friends.find((f) => f.id === replyToUser)?.display_name;
  const replying = !!(replyTo && replyToUser);
  const endReply = () => router.setParams({ replyTo: '', replyToUser: '' });

  async function pick(source: 'camera' | 'library') {
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Camera access is off', 'Turn on camera access for CHEERS! in Settings to snap your drink.');
        return;
      }
    }
    const res = source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!res.canceled) {
      setPhoto({ uri: res.assets[0].uri, mimeType: res.assets[0].mimeType });
      setSentNote('');
      setLastSent(null);
    }
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      const name = await suggestPlaceName();
      if (name) setLocation(name);
      else Alert.alert('No location found', 'Type the place name instead.');
    } catch {
      Alert.alert('No location found', 'Type the place name instead.');
    } finally {
      setLocating(false);
    }
  }

  const toggle = (id: string) => setTo((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const names = to.map((id) => friends.find((f) => f.id === id)?.display_name ?? '');
  const label = !to.length ? 'Send CHEERS!' :
    `Send CHEERS! to ${names.length > 2 ? `${names.length} friends` : names.join(' and ')}`;

  async function send() {
    if (!photo || !to.length) return;
    setSending(true);
    try {
      const isReply = replying && to.includes(replyToUser!);
      await sendCheers({
        photoUri: photo.uri, mimeType: photo.mimeType, locationName: location, recipientIds: to,
        replyTo: isReply ? { id: replyTo!, toUserId: replyToUser! } : undefined,
      });
      if (isReply) { await cheersBack(replyTo!).catch(() => {}); endReply(); }
      setLastSent({ uri: photo.uri, location });
      setClink((n) => n + 1);
      setSentNote(`CHEERS! sent to ${names.length > 2 ? `${names.length} friends` : names.join(' and ')}`);
      setPhoto(null); setLocation(''); setTo([]);
    } catch (e: any) {
      Alert.alert('Your CHEERS! didn’t send', e.message);
    } finally {
      setSending(false);
    }
  }

  // Share the current photo, or the one just sent, to a group chat or anyone not on CHEERS!
  const shareTarget = photo ? { uri: photo.uri, location } : lastSent;
  async function share() {
    if (!shareTarget) return;
    setSharing(true);
    try {
      await shareCheersPhoto({
        localUri: shareTarget.uri,
        message: inviteMessage({ displayName: profile?.display_name, username: profile?.username, location: shareTarget.location.trim() }),
      });
    } catch (e: any) {
      Alert.alert('Couldn’t open sharing', e.message);
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <Header />
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Text style={s.h}>Send a CHEERS!</Text>

        {replying && (
          <View style={s.replyBar}>
            <Text style={{ color: t.ink, fontWeight: '700', flex: 1 }}>🍻 Cheering back to {replyName ?? 'your friend'}</Text>
            <Pressable onPress={() => { endReply(); setTo([]); }} hitSlop={10}>
              <Text style={{ color: t.muted, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>
        )}
        <View style={s.shot}>
          {photo ? (
            <Image source={photo.uri} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={s.shotEmpty}>
              <Text style={{ fontSize: 48 }}>📸</Text>
              <Text style={{ color: t.muted, fontSize: 16 }}>{sentNote || 'Snap a photo of your drink'}</Text>
            </View>
          )}
        </View>
        <View style={s.row}>
          <Chip label="📷 Take photo" onPress={() => pick('camera')} />
          <Chip label="🖼️ Choose from library" onPress={() => pick('library')} />
        </View>

        <Text style={s.label}>Where are you?</Text>
        <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="Add a place (optional)"
          placeholderTextColor={t.muted} maxLength={80} />
        <View style={s.row}>
          <Chip label={locating ? 'Finding you…' : '📍 Use my location'} onPress={useMyLocation} />
          {location ? <Chip label="Clear" onPress={() => setLocation('')} /> : null}
        </View>

        <Text style={s.label}>Send to</Text>
        {friends.length ? (
          <View style={s.row}>
            {friends.map((f) => (
              <Chip key={f.id} label={f.display_name} selected={to.includes(f.id)} onPress={() => toggle(f.id)}
                left={<Avatar profile={f} size={22} />} />
            ))}
          </View>
        ) : (
          <Pressable onPress={() => router.push('/friends')}>
            <Text style={{ color: t.accent, fontWeight: '600', fontSize: 16 }}>Add friends to send your first CHEERS!</Text>
          </Pressable>
        )}

        <PrimaryButton title={label} onPress={send} disabled={!photo || !to.length} loading={sending} style={{ marginTop: 16 }} />
        <SecondaryButton
          title={!photo && lastSent ? 'Also share to a group chat' : 'Share to a group chat'}
          onPress={share} disabled={!shareTarget} loading={sharing} />
        <Text style={{ color: t.muted, fontSize: 13, textAlign: 'center' }}>
          Send it to a group text or anyone who isn’t on CHEERS! yet.
        </Text>
      </ScrollView>
      <ClinkAnimation trigger={clink} />
    </SafeAreaView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  wrap: { padding: 20, gap: 12, paddingBottom: 60 },
  h: { color: t.ink, fontSize: 24, fontWeight: '800' },
  shot: { aspectRatio: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: t.surface, borderWidth: 2, borderColor: t.line, borderStyle: 'dashed' },
  shotEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.accent, borderRadius: 16, padding: 14 },
  label: { color: t.ink, fontWeight: '700', fontSize: 16, marginTop: 12 },
  input: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: t.ink },
});
