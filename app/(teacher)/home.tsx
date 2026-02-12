import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';

interface ClassStatus {
  id: string;
  name: string;
  total: number;
  checked: number;
  sent: boolean;
}

export default function TeacherHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [classStatuses, setClassStatuses] = useState<ClassStatus[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get teacher name (read-only Supabase)
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .single();

      if (!teacher) return;
      setTeacherName(teacher.name);

      // Get dagym status from API
      const res = await apiFetch('/api/teacher/dagym/status');
      const json = await res.json();

      if (res.ok && json.classes) {
        setClassStatuses(
          json.classes.map((cls: any) => ({
            id: cls.id || cls.class_id,
            name: cls.name || cls.class_name,
            total: cls.total || 0,
            checked: cls.checked || 0,
            sent: cls.sent || false,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello,</Text>
        <Text style={styles.name}>{teacherName || 'Teacher'}</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Quick Action */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.coachButton}
          onPress={() => router.push('/(teacher)/coach')}
        >
          <View style={styles.coachButtonIcon}>
            <Ionicons name="create" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.coachButtonContent}>
            <Text style={styles.coachButtonTitle}>Start Coaching</Text>
            <Text style={styles.coachButtonSubtitle}>
              Check today's student commitments
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Today's Classes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Classes</Text>
          <Text style={styles.classCount}>
            {classStatuses.length} classes
          </Text>
        </View>

        {classStatuses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="school-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No classes assigned</Text>
          </View>
        ) : (
          classStatuses.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={styles.classCard}
              onPress={() => router.push('/(teacher)/coach')}
            >
              <View style={styles.classCardHeader}>
                <Text style={styles.className}>{cls.name}</Text>
                {cls.sent && (
                  <View style={styles.sentBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#16A34A"
                    />
                    <Text style={styles.sentBadgeText}>Sent</Text>
                  </View>
                )}
              </View>
              {cls.total > 0 ? (
                <View style={styles.progressRow}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${
                            cls.total > 0
                              ? (cls.checked / cls.total) * 100
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {cls.checked}/{cls.total}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noItemsText}>No coaching items</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  greeting: {
    fontSize: 16,
    color: '#64748B',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 2,
  },
  date: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  section: {
    padding: 16,
  },
  coachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  coachButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  coachButtonContent: {
    flex: 1,
  },
  coachButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  coachButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  classCount: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  className: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  sentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    minWidth: 40,
    textAlign: 'right',
  },
  noItemsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
