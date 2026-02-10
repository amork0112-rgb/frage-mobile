import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { signOut } from '../../lib/auth';
import { registerForPushNotifications, unregisterPushToken } from '../../lib/push';
import { supabase } from '../../lib/supabase';

export default function TeacherSettings() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkPushStatus();
  }, []);

  async function checkPushStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }

      const { status } = await Notifications.getPermissionsAsync();
      setPushEnabled(status === 'granted');
    } catch (error) {
      console.error('Error checking push status:', error);
    }
  }

  async function handleEnablePush() {
    if (!userId) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      const token = await registerForPushNotifications(userId);
      if (token) {
        setPushEnabled(true);
        Alert.alert('Success', 'Push notifications enabled');
      } else {
        Alert.alert('Error', 'Failed to enable push notifications');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enable push notifications');
    }
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            if (userId) {
              await unregisterPushToken(userId);
            }
            await signOut();
            router.replace('/auth/login');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  {pushEnabled
                    ? 'Enabled - You will receive important updates'
                    : 'Disabled - Enable to receive important updates'}
                </Text>
              </View>
              <View style={[styles.statusBadge, pushEnabled && styles.statusBadgeEnabled]}>
                <Text style={[styles.statusText, pushEnabled && styles.statusTextEnabled]}>
                  {pushEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
            {!pushEnabled && (
              <TouchableOpacity style={styles.enableButton} onPress={handleEnablePush}>
                <Text style={styles.enableButtonText}>Enable Notifications</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>FRAGE English Academy</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  statusBadgeEnabled: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statusTextEnabled: {
    color: '#16A34A',
  },
  enableButton: {
    marginTop: 16,
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
    color: '#CBD5E1',
  },
});
