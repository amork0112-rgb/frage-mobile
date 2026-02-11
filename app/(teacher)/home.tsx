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

interface CoachingNote {
  id: string;
  student_name: string;
  content: string;
  created_at: string;
}

export default function TeacherHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [todayNotes, setTodayNotes] = useState<CoachingNote[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teacher name
      const { data: teacher } = await supabase
        .from('teachers')
        .select('name')
        .eq('auth_user_id', user.id)
        .single();

      if (teacher) {
        setTeacherName(teacher.name);
      }

      // Get today's coaching notes (commitments created today by this teacher)
      const today = new Date().toISOString().split('T')[0];
      const { data: notes } = await supabase
        .from('commitments')
        .select(`
          id,
          content,
          created_at,
          students ( name, english_name )
        `)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notes) {
        setTodayNotes(
          notes.map((n: any) => ({
            id: n.id,
            student_name: n.students?.english_name || n.students?.name || 'Unknown',
            content: n.content,
            created_at: n.created_at,
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

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
            <Text style={styles.coachButtonTitle}>Write Coaching Note</Text>
            <Text style={styles.coachButtonSubtitle}>
              Record observations from today's class
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Today's Notes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Notes</Text>
          <Text style={styles.noteCount}>{todayNotes.length} notes</Text>
        </View>

        {todayNotes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No coaching notes yet today</Text>
            <Text style={styles.emptySubtext}>
              Tap the button above to start coaching
            </Text>
          </View>
        ) : (
          todayNotes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={styles.studentBadge}>
                  <Text style={styles.studentBadgeText}>
                    {note.student_name}
                  </Text>
                </View>
                <Text style={styles.noteTime}>
                  {formatTime(note.created_at)}
                </Text>
              </View>
              <Text style={styles.noteContent} numberOfLines={3}>
                {note.content}
              </Text>
            </View>
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
  noteCount: {
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
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  noteCard: {
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
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  studentBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studentBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066CC',
  },
  noteTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  noteContent: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
});
