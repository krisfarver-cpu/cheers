import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { savePushToken } from './api';

// Show the CHEERS! banner even when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Asks permission, gets this device's push token, and saves it to Supabase. Call after sign-in. */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators can't receive push

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'CHEERS!',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('No EAS projectId found. Run `npx eas init` in the project folder.');

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await savePushToken(token);
  return token;
}

/** Runs handler with the CHEERS! id when someone taps a notification. Returns an unsubscribe function. */
export function onCheersNotificationTap(handler: (cheersId: string) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const id = response.notification.request.content.data?.cheersId;
    if (typeof id === 'string') handler(id);
  });
  return () => sub.remove();
}
