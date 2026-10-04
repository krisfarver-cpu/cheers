import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { formatPhone, phoneDigits } from '../lib/phone';
import { Theme, useTheme } from '../lib/theme';
import { PrimaryButton } from '../components/Buttons';

/** Add or change your phone number, verified with a texted code, so friends can find you from their contacts. */
export default function PhoneScreen() {
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const { session } = useAuth();
  const current = session?.user.phone && session.user.phone_confirmed_at ? session.user.phone : null;
  const [step, setStep] = useState<'number' | 'code'>('number');
  const [typed, setTyped] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const digits = phoneDigits(typed);

  async function sendCode() {
    if (!digits) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ phone: `+${digits}` });
      if (error) throw error;
      setStep('code');
    } catch (e: any) {
      const msg = String(e.message ?? '');
      Alert.alert('Couldn’t send a code', /already|registered|exists/i.test(msg)
        ? 'That number is already used by another CHEERS! account.'
        : msg);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!digits) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: `+${digits}`, token: code.trim(), type: 'phone_change' });
      if (error) throw error;
      await supabase.auth.refreshSession();
      Alert.alert('Phone number added', 'Friends who have your number saved can now find you on CHEERS!.');
      router.back();
    } catch (e: any) {
      Alert.alert('That didn’t work', /expired|invalid/i.test(String(e.message))
        ? 'That code is wrong or expired. Send a new one and try again.'
        : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.top}>
        <Text style={s.h}>Phone number</Text>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" style={s.close}>
          <Text style={{ color: t.ink, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
          {current ? <Text style={s.current}>Your number: {formatPhone(current)}</Text> : null}
          {step === 'number' ? (
            <>
              <Text style={s.tag}>
                Add your number so friends who have it saved can find you on CHEERS!. We’ll text you a code to confirm it’s yours. Your number isn’t shown to anyone.
              </Text>
              <TextInput style={s.input} placeholder="(555) 123-4567" placeholderTextColor={t.muted} value={typed}
                onChangeText={setTyped} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" autoFocus />
              <PrimaryButton title={current ? 'Change number' : 'Text me a code'} onPress={sendCode} disabled={!digits} loading={busy} />
              <Text style={s.small}>Message and data rates may apply. You can turn off being found in Account and settings.</Text>
            </>
          ) : (
            <>
              <Text style={s.tag}>We texted a code to {formatPhone(digits)}.</Text>
              <TextInput style={s.input} placeholder="6-digit code" placeholderTextColor={t.muted} value={code} onChangeText={setCode}
                keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={8} autoFocus />
              <PrimaryButton title="Confirm" onPress={verify} disabled={code.trim().length < 4} loading={busy} />
              <Pressable onPress={sendCode} disabled={busy} style={{ padding: 12 }}>
                <Text style={s.link}>Send a new code</Text>
              </Pressable>
              <Pressable onPress={() => { setStep('number'); setCode(''); }} style={{ padding: 4 }}>
                <Text style={s.link}>Use a different number</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  h: { color: t.ink, fontSize: 24, fontWeight: '800' },
  close: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  wrap: { padding: 20, gap: 12 },
  current: { color: t.ink, fontSize: 16, fontWeight: '700' },
  tag: { color: t.muted, fontSize: 15, lineHeight: 21 },
  small: { color: t.muted, fontSize: 12, textAlign: 'center' },
  input: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 18, color: t.ink },
  link: { color: t.accent, textAlign: 'center', fontWeight: '600' },
});
