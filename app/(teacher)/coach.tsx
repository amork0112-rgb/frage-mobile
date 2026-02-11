import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// Types
type CommitmentStatus = 'unchecked' | 'done' | 'partial' | 'not_done';

type Student = {
  id: string;
  name: string;
  english_name: string;
  send_status: 'not_sent' | 'sent' | 'failed';
};

type Subject = {
  id: string;
  title: string;
};

type ClassItem = {
  id: string;
  name: string;
};

// Status cycling
const NEXT_STATUS: Record<CommitmentStatus, CommitmentStatus> = {
  unchecked: 'done',
  done: 'partial',
  partial: 'not_done',
  not_done: 'unchecked',
};

const STATUS_CONFIG: Record<CommitmentStatus, { icon: string; color: string; bg: string; label: string }> = {
  unchecked: { icon: 'square-outline', color: '#CBD5E1', bg: '#F8FAFC', label: '-' },
  done: { icon: 'checkmark-circle', color: '#22C55E', bg: '#F0FDF4', label: 'Done' },
  partial: { icon: 'warning', color: '#F59E0B', bg: '#FFFBEB', label: 'Partial' },
  not_done: { icon: 'close-circle', color: '#EF4444', bg: '#FEF2F2', label: 'Not done' },
};

export default function CoachScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [date] = useState<string>(new Date().toISOString().split('T')[0]);

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [commitments, setCommitments] = useState<Record<string, CommitmentStatus>>({});

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId && date) {
      loadCommitments();
    }
  }, [selectedClassId, date]);

  async function loadClasses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teacher } = await supabase
        .from('teachers')
        .select('email')
        .eq('auth_user_id', user.id)
        .single();

      if (!teacher) return;

      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', teacher.email)
        .order('name');

      if (classData && classData.length > 0) {
        setClasses(classData);
        if (!selectedClassId) {
          setSelectedClassId(classData[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  }

  async function loadCommitments() {
    setLoading(true);
    try {
      // Load students for this class
      const { data: studentData } = await supabase
        .from('students')
        .select('id, name, english_name')
        .eq('class_id', selectedClassId)
        .order('name');

      // Load subjects/books for this class
      const { data: subjectData } = await supabase
        .from('books')
        .select('id, title')
        .eq('class_id', selectedClassId)
        .order('title');

      // Load existing commitments for today
      const { data: commitmentData } = await supabase
        .from('commitments')
        .select('id, student_id, book_id, status')
        .eq('class_id', selectedClassId)
        .eq('date', date);

      setStudents(
        (studentData || []).map((s) => ({
          ...s,
          send_status: 'not_sent' as const,
        }))
      );
      setSubjects(subjectData || []);

      const map: Record<string, CommitmentStatus> = {};
      (commitmentData || []).forEach((c: any) => {
        map[`${c.student_id}-${c.book_id}`] = c.status;
      });
      setCommitments(map);
    } catch (error) {
      console.error('Error loading commitments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleStatusToggle(studentId: string, bookId: string) {
    const key = `${studentId}-${bookId}`;
    const currentStatus = commitments[key] || 'unchecked';
    const nextStatus = NEXT_STATUS[currentStatus];

    // Optimistic update
    setCommitments((prev) => ({ ...prev, [key]: nextStatus }));

    try {
      // Upsert commitment
      const { error } = await supabase
        .from('commitments')
        .upsert(
          {
            student_id: studentId,
            class_id: selectedClassId,
            book_id: bookId,
            date: date,
            status: nextStatus,
          },
          { onConflict: 'student_id,book_id,date' }
        );

      if (error) throw error;
    } catch (error) {
      // Revert on failure
      setCommitments((prev) => ({ ...prev, [key]: currentStatus }));
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  }

  async function handleSendReports() {
    if (!selectedClassId || students.length === 0) {
      Alert.alert('Error', 'No students to send reports to');
      return;
    }

    // Check if any commitments exist
    const hasCommitments = Object.keys(commitments).some(
      (key) => commitments[key] !== 'unchecked'
    );

    if (!hasCommitments) {
      Alert.alert('Error', 'No coaching records to send');
      return;
    }

    Alert.alert(
      'Send to Parents',
      'Send today\'s coaching results to all parents in this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'default',
          onPress: async () => {
            setSending(true);
            try {
              // Mark as sent in local state
              setStudents((prev) =>
                prev.map((s) => ({ ...s, send_status: 'sent' as const }))
              );
              Alert.alert('Success', 'Coaching results sent to parents!');
            } catch (error) {
              console.error('Error sending reports:', error);
              Alert.alert('Error', 'Failed to send reports');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  }

  function onRefresh() {
    setRefreshing(true);
    loadCommitments();
  }

  function renderStatusButton(studentId: string, subject: Subject) {
    const key = `${studentId}-${subject.id}`;
    const status = commitments[key] || 'unchecked';
    const config = STATUS_CONFIG[status];

    return (
      <TouchableOpacity
        key={key}
        style={[styles.statusButton, { backgroundColor: config.bg }]}
        onPress={() => handleStatusToggle(studentId, subject.id)}
        activeOpacity={0.6}
      >
        <Ionicons name={config.icon as any} size={20} color={config.color} />
        <Text style={[styles.subjectName, { color: status === 'unchecked' ? '#94A3B8' : '#1E293B' }]} numberOfLines={1}>
          {subject.title}
        </Text>
      </TouchableOpacity>
    );
  }

  const isAlreadySent = students.some((s) => s.send_status === 'sent');

  return (
    <View style={styles.container}>
      {/* Class Selector */}
      <View style={styles.classSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classScroll}>
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={[
                styles.classChip,
                selectedClassId === cls.id && styles.classChipSelected,
              ]}
              onPress={() => setSelectedClassId(cls.id)}
            >
              <Text
                style={[
                  styles.classChipText,
                  selectedClassId === cls.id && styles.classChipTextSelected,
                ]}
              >
                {cls.name}
              </Text>
            </TouchableOpacity>
          ))}
          {classes.length === 0 && (
            <Text style={styles.noClassText}>No classes found</Text>
          )}
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Tap to cycle:</Text>
        {(['done', 'partial', 'not_done', 'unchecked'] as CommitmentStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <Ionicons name={STATUS_CONFIG[s].icon as any} size={16} color={STATUS_CONFIG[s].color} />
            <Text style={styles.legendText}>{STATUS_CONFIG[s].label}</Text>
          </View>
        ))}
      </View>

      {/* Student Cards */}
      {loading && students.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {students.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No students in this class</Text>
            </View>
          ) : (
            students.map((student) => (
              <View key={student.id} style={styles.studentCard}>
                {/* Student Header */}
                <View style={styles.studentHeader}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    {student.english_name ? (
                      <Text style={styles.studentEnglish}>({student.english_name})</Text>
                    ) : null}
                  </View>
                  {student.send_status === 'sent' && (
                    <View style={styles.sentBadge}>
                      <Text style={styles.sentBadgeText}>Sent</Text>
                    </View>
                  )}
                </View>

                {/* Subject Status Grid */}
                {subjects.length > 0 ? (
                  <View style={styles.statusGrid}>
                    {subjects.map((sub) => renderStatusButton(student.id, sub))}
                  </View>
                ) : (
                  <Text style={styles.noSubjectsText}>No subjects assigned</Text>
                )}
              </View>
            ))
          )}

          {/* Send Button */}
          {students.length > 0 && (
            <TouchableOpacity
              style={[
                styles.sendButton,
                (sending || isAlreadySent) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendReports}
              disabled={sending || isAlreadySent}
            >
              <Ionicons
                name={isAlreadySent ? 'checkmark-circle' : 'send'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.sendButtonText}>
                {sending
                  ? 'Sending...'
                  : isAlreadySent
                  ? 'Sent to Parents'
                  : 'Send to Parents'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
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
  },

  // Class Selector
  classSelector: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
  },
  classScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  classChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  classChipSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  classChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  classChipTextSelected: {
    color: '#FFFFFF',
  },
  noClassText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    gap: 12,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
  },

  // Student Cards
  scrollView: {
    flex: 1,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  studentEnglish: {
    fontSize: 13,
    color: '#64748B',
  },
  sentBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },

  // Status Grid
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 100,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  noSubjectsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },

  // Send Button
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowColor: '#94A3B8',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
