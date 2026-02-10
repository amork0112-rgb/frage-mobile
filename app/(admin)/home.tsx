import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Stats = {
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  totalNotices: number;
};

export default function AdminHome() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    totalNotices: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      // Load all stats in parallel
      const [
        { count: teacherCount },
        { count: studentCount },
        { count: classCount },
        { count: noticeCount },
      ] = await Promise.all([
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('notices').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalTeachers: teacherCount || 0,
        totalStudents: studentCount || 0,
        totalClasses: classCount || 0,
        totalNotices: noticeCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadStats();
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
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Admin Dashboard</Text>
          <Text style={styles.welcomeSubtitle}>FRAGE English Academy</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👨‍🏫</Text>
            <Text style={styles.statValue}>{stats.totalTeachers}</Text>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👨‍🎓</Text>
            <Text style={styles.statValue}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📚</Text>
            <Text style={styles.statValue}>{stats.totalClasses}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📢</Text>
            <Text style={styles.statValue}>{stats.totalNotices}</Text>
            <Text style={styles.statLabel}>Notices</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>• Manage Teachers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>• Manage Students</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>• Create Notice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>• View Reports</Text>
          </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#0066CC',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
});
