import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id-here', // Replace with actual EAS project ID
    });

    const token = tokenData.data;

    // Store token in Supabase
    await supabase
      .from('device_tokens')
      .upsert({
        user_id: userId,
        platform: Platform.OS,
        token: token,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      });

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

export async function unregisterPushToken(userId: string) {
  try {
    await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('platform', Platform.OS);
  } catch (error) {
    console.error('Error unregistering push token:', error);
  }
}
