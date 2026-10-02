import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Theme, useTheme, WORDMARK_FONT } from '../lib/theme';
import { PrimaryButton } from '../components/Buttons';

/**
 * Forgot password: email a 6-digit code, then set a new password.
 * Verifying the code signs the person in, which takes them into the app.
 */
export default function Forgot() {
  const t = useTheme();
  const s = styles(t);
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
      if (error) throw error;
      setStep('code');
    } catch (e: any) {
      Alert.alert('Couldn’t send a code', e.message?.includes('Signups not allowed')
        ? 'There’s no account with that email. Check the spelling, or create a new account.'
        : e.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) throw error;
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw pwError;
      Alert.alert('Password updated', 'You’re signed in. Use your new password next time.');
    } catch (e: any) {
      Alert.alert('That didn’t work', e.message?.toLowerCase().includes('expired') || e.message?.toLowerCase().includes('invalid')
        ? 'That code is wrong or expired. Request a new one and try again.'
        : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
          <Text style={s.wordmark}>CHEERS!</Text>
          <Text style={s.h}>Reset your password</Text>

          {step === 'email' ? (
            <>
              <Text style={s.tag}>Enter your account’s email, and we’ll send you a 6-digit code.</Text>
              <TextInput style={s.input} placeholder="Email" placeholderTextColor={t.muted} value={email} onChangeText={setEmail}
                autoCapitalize="none" autoComplete="email" keyboardType="email-address" autoFocus />
              <PrimaryButton title="Send code" onPress={sendCode} disabled={!email.includes('@')} loading={busy} />
            </>
          ) : (
            <>
              <Text style={s.tag}>We sent a code to {email.trim()}. It can take a minute to arrive, so check spam too.</Text>
              <TextInput style={s.input} placeholder="6-digit code" placeholderTextColor={t.muted} value={code} onChangeText={setCode}
                keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={8} autoFocus />
              <TextInput style={s.input} placeholder="New password (8+ characters)" placeholderTextColor={t.muted} value={password}
                onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
              <PrimaryButton title="Set new password" onPress={reset} disabled={code.trim().length < 6 || password.length < 8} loading={busy} />
              <Pressable onPress={sendCode} style={{ padding: 12 }} disabled={busy}>
                <Text style={s.link}>Send a new code</Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={() => router.back()} style={{ padding: 12 }}>
            <Text style={s.link}>Back to sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  wrap: { padding: 24, paddingTop: 64, gap: 12 },
  wordmark: { fontFamily: WORDMARK_FONT, fontSize: 48, color: t.accent, textAlign: 'center', transform: [{ rotate: '-4deg' }] },
  h: { color: t.ink, fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  tag: { color: t.muted, textAlign: 'center', fontSize: 15, marginBottom: 8 },
  input: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: t.ink },
  link: { color: t.accent, textAlign: 'center', fontWeight: '600' },
});
