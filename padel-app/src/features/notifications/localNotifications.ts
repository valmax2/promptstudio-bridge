import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let permissionAsked = false;

/**
 * These are LOCAL notifications only — they fire on this device for this
 * device's own events (a reminder before a match you created/joined). There
 * is no backend here to push an invite to the other three players' phones;
 * that needs a real push-notification server and is not implemented. This
 * function exists so the plumbing (permission request, scheduling) is real
 * and ready to extend once remote push exists.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false; // no reliable local scheduling story on web here
  try {
    if (!permissionAsked) {
      permissionAsked = true;
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    }
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleEventReminder(title: string, body: string, fireDate: Date): Promise<void> {
  if (fireDate.getTime() <= Date.now()) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
  } catch {
    // Best-effort: a missing native module (e.g. web/Expo Go edge cases) shouldn't break event creation.
  }
}
