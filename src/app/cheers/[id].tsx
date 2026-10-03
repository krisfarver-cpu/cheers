import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { blockUser, Cheers, cheersBack, getCheers, markOpened, setLiked } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fullDate } from '../../lib/format';
import { usePhotoUrls } from '../../lib/usePhotoUrls';
import { Theme, useTheme } from '../../lib/theme';
import { Avatar } from '../../components/Avatar';
import { BRAND } from '../../lib/brand';
import { findItUrl, isPartnerBrand } from '../../lib/partner';
import { PrimaryButton, SecondaryButton } from '../../components/Buttons';
import { inviteMessage, shareCheersPhoto } from '../../lib/share';
import { ClinkAnimation } from '../../components/ClinkAnimation';

export default function CheersViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const [c, setC] = useState<Cheers | null>(null);
  const [clink, setClink] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [findIt, setFindIt] = useState<string | null>(null);
  const [carried, setCarried] = useState(false);
  const photo = usePhotoUrls(c ? [c.photo_path] : []);

  useEffect(() => {
    getCheers(id)
      .then((row) => {
        setC(row);
        if (row.recipient_id === session?.user.id && !row.opened_at) markOpened(row.id).catch(() => {});
      })
      .catch((e) => Alert.alert('Couldn’t open this CHEERS!', e.message));
  }, [id]);

  useEffect(() => {
    if (!c?.drink_brand) return;
    isPartnerBrand(c.drink_brand).then((ok) => {
      setCarried(ok);
      if (ok) findItUrl(c.drink_brand).then(setFindIt).catch(() => {});
    }).catch(() => {});
  }, [c?.drink_brand]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!c) {
    return <SafeAreaView style={[s.fill, { justifyContent: 'center' }]}><ActivityIndicator /></SafeAreaView>;
  }

  const incoming = c.recipient_id === session?.user.id;
  const other = incoming ? c.sender! : c.recipient!;

  async function toggleLike() {
    const liked = !c!.liked_at;
    setC({ ...c!, liked_at: liked ? new Date().toISOString() : null });
    try { await setLiked(c!.id, liked); }
    catch (e: any) { setC(c); Alert.alert('That didn’t save', e.message); }
  }

  async function sendBack() {
    setC({ ...c!, cheered_back_at: new Date().toISOString() });
    setClink((n) => n + 1);
    try { await cheersBack(c!.id); }
    catch (e: any) { setC(c); Alert.alert('Your CHEERS! back didn’t send', e.message); }
  }

  function openMenu() {
    Alert.alert(other.display_name, undefined, [
      {
        text: 'Report this CHEERS!',
        onPress: () => router.push({
          pathname: '/report',
          params: { userId: other.id, cheersId: c!.id, photoPath: c!.photo_path, name: other.display_name },
        }),
      },
      { text: `Block ${other.display_name}`, style: 'destructive', onPress: confirmBlock },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function confirmBlock() {
    Alert.alert(`Block ${other.display_name}?`,
      'They won’t be able to send you CHEERS! or friend requests, and their CHEERS! will be hidden from you. They won’t be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block', style: 'destructive', onPress: async () => {
            try { await blockUser(other.id); router.dismissTo('/'); }
            catch (e: any) { Alert.alert('Block didn’t work', e.message); }
          },
        },
      ]);
  }

  function replyWithPhoto() {
    if (router.canDismiss()) router.dismissAll();
    router.navigate({ pathname: '/send', params: { replyTo: c!.id, replyToUser: other.id } });
  }

  async function share() {
    const url = photo(c!.photo_path);
    if (!url) return;
    setSharing(true);
    try {
      await shareCheersPhoto({
        remoteUrl: url,
        fileName: c!.photo_path.split('/').pop(),
        message: inviteMessage({ displayName: profile?.display_name, username: profile?.username, location: c!.location_name }),
      });
    } catch (e: any) {
      Alert.alert('Couldn’t open sharing', e.message);
    } finally {
      setSharing(false);
    }
  }

  const reactions = [
    c.liked_at && `${other.display_name} liked it`,
    c.cheered_back_at && `${other.display_name} cheered back 🥂`,
  ].filter(Boolean).join(' and ');

  return (
    <SafeAreaView style={s.fill}>
      <View style={s.top}>
        {incoming ? (
          <Pressable onPress={openMenu} accessibilityLabel="Report or block" style={s.close}>
            <Text style={{ color: t.ink, fontSize: 16, fontWeight: '800' }}>•••</Text>
          </Pressable>
        ) : <View />}
        <Pressable onPress={close} accessibilityLabel="Close" style={s.close}><Text style={{ color: t.ink, fontSize: 18 }}>✕</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={s.photo}>
          <Image source={photo(c.photo_path)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          {c.location_name ? <View style={s.loc}><Text style={s.locText} numberOfLines={1}>📍 {c.location_name}</Text></View> : null}
        </View>

        {c.reply_to_id ? (
          <Text style={{ color: t.accent, fontWeight: '700', fontSize: 14 }}>↩︎ A CHEERS! back to yours</Text>
        ) : null}
        <View style={s.from}>
          <Avatar profile={other} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.ink, fontSize: 16 }}>
              <Text style={{ fontWeight: '700' }}>{incoming ? other.display_name : 'You'}</Text>
              <Text style={{ color: t.muted }}>{incoming ? ' sent you a CHEERS!' : ` sent this to ${other.display_name}`}</Text>
            </Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>{fullDate(c.created_at)}</Text>
          </View>
        </View>

        {(c.drink_category || c.drink_brand) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line }}>
            <Text style={{ fontSize: 26 }}>🍺</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.ink, fontWeight: '700', fontSize: 15 }}>{[c.drink_brand, c.drink_category].filter(Boolean).join(' · ')}</Text>
              {BRAND && carried && <Text style={{ color: t.muted, fontSize: 12 }}>{BRAND.distributedBy}</Text>}
            </View>
            {findIt ? (
              <Pressable onPress={() => Linking.openURL(findIt)} hitSlop={8} accessibilityLabel="Find it near you">
                <Text style={{ color: t.secondary, fontWeight: '700', fontSize: 14 }}>Find it ›</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {incoming ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={toggleLike} accessibilityRole="button" accessibilityState={{ selected: !!c.liked_at }}
              style={[s.like, c.liked_at && { borderColor: t.accent }]}>
              <Text style={{ color: c.liked_at ? t.accent : t.ink, fontWeight: '700', fontSize: 16 }}>
                {c.liked_at ? '♥ Liked' : '♡ Like'}
              </Text>
            </Pressable>
            <PrimaryButton style={{ flex: 1 }} onPress={sendBack} disabled={!!c.cheered_back_at}
              title={c.cheered_back_at ? '🥂 You cheered back' : 'CHEERS! back'} />
          </View>
        ) : null}
        {incoming ? (
          <SecondaryButton title="📸 Send a drink back" onPress={replyWithPhoto} />
        ) : (
          <>
            <Text style={{ color: t.muted, textAlign: 'center', fontSize: 15 }}>
              {reactions || `Waiting on ${other.display_name}…`}
            </Text>
            <SecondaryButton title="Share to a group chat" onPress={share} loading={sharing} disabled={!photo(c.photo_path)} />
          </>
        )}
      </ScrollView>
      <ClinkAnimation trigger={clink} />
    </SafeAreaView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: t.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  close: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  photo: { aspectRatio: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: t.line },
  loc: { position: 'absolute', left: 12, bottom: 12, right: 12, alignItems: 'flex-start' },
  locText: { backgroundColor: 'rgba(255,255,255,0.92)', color: '#2A1030', fontWeight: '600', fontSize: 14, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  from: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  like: { borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface, borderRadius: 999, paddingHorizontal: 20, justifyContent: 'center' },
});
