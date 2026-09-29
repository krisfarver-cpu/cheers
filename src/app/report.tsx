import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { blockUser, reportContent, ReportReason } from '../lib/api';
import { Theme, useTheme } from '../lib/theme';
import { PrimaryButton } from '../components/Buttons';

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'nudity', label: 'Nudity or sexual content' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'violence', label: 'Violence or dangerous behavior' },
  { key: 'underage', label: 'Someone under the legal drinking age' },
  { key: 'spam', label: 'Spam' },
  { key: 'other', label: 'Something else' },
];

export default function Report() {
  const { userId, cheersId, photoPath, name } =
    useLocalSearchParams<{ userId: string; cheersId?: string; photoPath?: string; name?: string }>();
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const who = name || 'this person';
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!reason) return;
    setSending(true);
    try {
      await reportContent({ reportedUserId: userId, cheersId, photoPath, reason, details });
      if (alsoBlock) await blockUser(userId);
      Alert.alert(
        'Report sent',
        `Thanks for letting us know. We review every report within 24 hours.${alsoBlock ? ` You won’t see CHEERS! from ${who} anymore.` : ''}`,
        [{ text: 'OK', onPress: () => (alsoBlock ? router.dismissTo('/') : router.back()) }],
      );
    } catch (e: any) {
      Alert.alert('Your report didn’t send', e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.top}>
        <Text style={s.h}>Report</Text>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" style={s.close}>
          <Text style={{ color: t.ink, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }} keyboardShouldPersistTaps="handled">
        <Text style={s.muted}>
          {cheersId ? `What’s wrong with this CHEERS! from ${who}?` : `What’s going on with ${who}?`} {who} won’t know you reported them.
        </Text>

        {REASONS.map((r) => {
          const on = reason === r.key;
          return (
            <Pressable key={r.key} onPress={() => setReason(r.key)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={[s.option, on && { borderColor: t.accent, borderWidth: 2 }]}>
              <View style={[s.radio, on && { borderColor: t.accent }]}>
                {on && <View style={[s.dot, { backgroundColor: t.accent }]} />}
              </View>
              <Text style={s.optionText}>{r.label}</Text>
            </Pressable>
          );
        })}

        <Text style={s.label}>Anything else we should know? (optional)</Text>
        <TextInput style={s.input} value={details} onChangeText={setDetails} multiline maxLength={500}
          placeholder="Add details" placeholderTextColor={t.muted} />

        <View style={s.blockRow}>
          <Switch value={alsoBlock} onValueChange={setAlsoBlock} trackColor={{ true: t.accent }} />
          <Text style={{ color: t.ink, flex: 1, fontSize: 15 }}>Also block {who}</Text>
        </View>

        <PrimaryButton title="Send report" onPress={submit} disabled={!reason} loading={sending} style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  h: { color: t.ink, fontSize: 24, fontWeight: '800' },
  close: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  muted: { color: t.muted, fontSize: 15, lineHeight: 21, marginBottom: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 16, padding: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: t.line, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { color: t.ink, fontSize: 16, flex: 1 },
  label: { color: t.ink, fontWeight: '700', fontSize: 15, marginTop: 12 },
  input: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line, borderRadius: 14, padding: 14, fontSize: 16, color: t.ink, minHeight: 90, textAlignVertical: 'top' },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
});
