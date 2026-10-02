import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Shrikhand_400Regular } from '@expo-google-fonts/shrikhand';
import { AuthProvider, useAuth } from '../lib/auth';
import { CheersNotice, onCheersNotificationTap, registerForPush } from '../lib/push';
import { useTheme } from '../lib/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading } = useAuth();
  const t = useTheme();
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Shrikhand_400Regular });
  const userId = session?.user.id;

  useEffect(() => {
    if (!loading && fontsLoaded) SplashScreen.hideAsync();
  }, [loading, fontsLoaded]);

  useEffect(() => {
    if (!userId) return;
    registerForPush().catch((e) => console.warn('Push setup skipped:', e.message));

    // Tapping a CHEERS! notification opens that drink
    const open = (n: CheersNotice) => {
      if (typeof n.groupId === 'string') router.push(`/group/${n.groupId}`);
      else if (typeof n.cheersId === 'string') router.push(`/cheers/${n.cheersId}`);
    };
    const off = onCheersNotificationTap(open);

    // Same, when the tap launched the app from closed
    Notifications.getLastNotificationResponseAsync().then((r) => {
      const n = r?.notification.request.content.data as CheersNotice | undefined;
      if (n && (n.groupId || n.cheersId)) {
        open(n);
        Notifications.clearLastNotificationResponseAsync?.();
      }
    });
    return off;
  }, [userId]);

  if (loading || !fontsLoaded) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="cheers/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="friends" options={{ presentation: 'modal' }} />
          <Stack.Screen name="report" options={{ presentation: 'modal' }} />
          <Stack.Screen name="account" options={{ presentation: 'modal' }} />
          <Stack.Screen name="group/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="group-info/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="group/[id]" options={{
            headerShown: true, title: '', headerBackTitle: 'Back', headerTintColor: t.ink,
            headerStyle: { backgroundColor: t.bg }, headerShadowVisible: false,
          }} />
          <Stack.Screen name="thread/[friendId]" options={{
            headerShown: true, title: '', headerBackTitle: 'History', headerTintColor: t.ink,
            headerStyle: { backgroundColor: t.bg }, headerShadowVisible: false,
          }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
