import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getUserRole } from '../lib/auth';
import { registerForPushNotifications } from '../lib/push';

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  async function checkAuthAndRedirect() {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/auth/login');
        return;
      }

      // Get user role
      const role = await getUserRole(session.user);

      // Register for push notifications
      await registerForPushNotifications(session.user.id);

      // Redirect based on role
      switch (role) {
        case 'master_admin':
        case 'admin':
          // Admin users go to admin section
          router.replace('/(admin)/home');
          break;
        case 'master_teacher':
        case 'teacher':
        case 'campus':
          // Teachers go to teacher section
          router.replace('/(teacher)/home');
          break;
        case 'parent':
          // Parents go to parent section
          router.replace('/(parent)/home');
          break;
        default:
          // Unknown role, redirect to login
          router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Error during auth check:', error);
      router.replace('/auth/login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0066CC" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
});
