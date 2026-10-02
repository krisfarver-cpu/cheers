import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { isUsernameAvailable, signIn, signUp } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Theme, useTheme, WORDMARK_FONT } from '../lib/theme';
import { PrimaryButton } from '../components/Buttons';
import { TERMS_URL } from '../lib/config';
import { BRAND } from '../lib/brand';

const USERNAME_RULE = /^[a-z0-9_]{3,20}$/;

export default function SignIn() {
  const t = useTheme();
  const s = styles(t);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [ofAge, setOfAge] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const signingUp = mode === 'up';
  const ready = email.includes('@') && password.length >= 8 &&
    (!signingUp || (USERNAME_RULE.test(username.toLowerCase()) && displayName.trim() && ofAge && agreed));

  async function submit() {
    setBusy(true);
    try {
      if (signingUp) {
        if (!(await isUsernameAvailable(username))) {
          Alert.alert('Username taken', `@${username.toLowerCase()} is already in use. Try another.`);
          return;
        }
        await signUp(email.trim(), password, username, displayName);
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          Alert.alert('Check your email', 'Tap the link we sent to confirm your account, then sign in.');
          setMode('in');
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e: any) {
      Alert.alert(signingUp ? 'Sign-up didn’t work' : 'Sign-in didn’t work', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
          {BRAND && <Image source={BRAND.logo} accessibilityLabel={BRAND.partnerName} style={{ width: 170, height: 104, alignSelf: 'center' }} resizeMode="contain" />}
          <Text style={s.wordmark}>CHEERS!</Text>
          <Text style={s.tag}>{BRAND ? BRAND.tagline : 'Share a drink with friends, wherever you are.'}</Text>

          <TextInput style={s.input} placeholder="Email" placeholderTextColor={t.muted} value={email} onChangeText={setEmail}
            autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
          <TextInput style={s.input} placeholder="Password (8+ characters)" placeholderTextColor={t.muted} value={password}
            onChangeText={setPassword} secureTextEntry autoComplete={signingUp ? 'new-password' : 'current-password'} />

          {signingUp && (
            <>
              <TextInput style={s.input} placeholder="Your name" placeholderTextColor={t.muted} value={displayName}
                onChangeText={setDisplayName} maxLength={40} autoComplete="name" />
              <TextInput style={s.input} placeholder="Username (letters, numbers, _)" placeholderTextColor={t.muted}
                value={username} onChangeText={(v) => setUsername(v.toLowerCase())} autoCapitalize="none" maxLength={20} />
              <View style={s.ageRow}>
                <Switch value={ofAge} onValueChange={setOfAge} trackColor={{ true: t.accent }} />
                <Text style={s.ageText}>I’m of legal drinking age where I live</Text>
              </View>
              <View style={s.ageRow}>
                <Switch value={agreed} onValueChange={setAgreed} trackColor={{ true: t.accent }} />
                <Text style={s.ageText}>
                  I agree to the{' '}
                  <Text style={{ color: t.accent, fontWeight: '700' }} onPress={() => Linking.openURL(TERMS_URL)}>Terms of use</Text>
                  , including no tolerance for objectionable content or abusive behavior
                </Text>
              </View>
            </>
          )}

          <PrimaryButton title={signingUp ? 'Create account' : 'Sign in'} onPress={submit} disabled={!ready} loading={busy} style={{ marginTop: 8 }} />

          {!signingUp && (
            <Link href="/forgot" style={[s.switch, { padding: 8 }]}>Forgot password?</Link>
          )}
          <Pressable onPress={() => setMode(signingUp ? 'in' : 'up')} style={{ padding: 16 }}>
            <Text style={s.switch}>{signingUp ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
          </Pressable>
          {BRAND && <Text style={[s.tag, { fontSize: 12, marginTop: 8 }]}>{BRAND.footer} Please drink responsibly.</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  wrap: { padding: 24, paddingTop: 64, gap: 12 },
  wordmark: { fontFamily: WORDMARK_FONT, fontSize: 60, color: t.accent, textAlign: 'center', transform: [{ rotate: '-4deg' }] },
  tag: { color: t.muted, textAlign: 'center', fontSize: 16, marginBottom: 24 },
  input: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: t.ink },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  ageText: { color: t.ink, flex: 1, fontSize: 15 },
  switch: { color: t.accent, textAlign: 'center', fontWeight: '600' },
});
