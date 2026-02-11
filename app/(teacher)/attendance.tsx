import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getTeacherStudents, markAttendance } from '../../lib/teacher';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
}

export default function TeacherAttendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Map<string, 'present' | 'absent' | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load students
      const studentsData = await getTeacherStudents(user.id);
      setStudents(studentsData);

      // Load today's attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('date', todayDate)
        .in('student_id', studentsData.map(s => s.id));

      const attendanceMap = new Map();
      attendanceData?.forEach((record: any) => {
        attendanceMap.set(record.student_id, record.status);
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleAttendance(studentId: string, status: 'present' | 'absent') {
    const currentStatus = attendance.get(studentId);
    const newStatus = currentStatus === status ? null : status;
    
    setAttendance(new Map(attendance.set(studentId, newStatus)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const records = Array.from(attendance.entries())
        .filter((entry): entry is [string, 'present' | 'absent'] => entry[1] !== null)
        .map(([student_id, status]) => ({
          student_id,
          status,
        }));

      if (records.length === 0) {
        Alert.alert('Error', 'Please mark attendance for at least one student');
        return;
      }

      await markAttendance(user.id, todayDate, records);
      Alert.alert('Success', 'Attendance saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  }

  function renderStudent({ item }: { item: Student }) {
    const status = attendance.get(item.id);

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.first_name[0]}
              {item.last_name[0]}
            </Text>
          </View>
          <View style={styles.studentDetails}>
            <Text style={styles.studentName}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.studentGrade}>Grade {item.grade}</Text>
          </View>
        </View>

        <View style={styles.attendanceButtons}>
          <TouchableOpacity
            style={[
              styles.attendanceButton,
              status === 'present' && styles.presentButton,
            ]}
            onPress={() => toggleAttendance(item.id, 'present')}
          >
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={status === 'present' ? '#FFFFFF' : '#10B981'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.attendanceButton,
              status === 'absent' && styles.absentButton,
            ]}
            onPress={() => toggleAttendance(item.id, 'absent')}
          >
            <Ionicons
              name="close-circle"
              size={24}
              color={status === 'absent' ? '#FFFFFF' : '#EF4444'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  const markedCount = Array.from(attendance.values()).filter(s => s !== null).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</Text>
        <Text style={styles.countText}>
          {markedCount} of {students.length} marked
        </Text>
      </View>

      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Attendance'}
          </Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  countText: {
    fontSize: 14,
    color: '#64748B',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  studentGrade: {
    fontSize: 14,
    color: '#64748B',
  },
  attendanceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  attendanceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  presentButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  absentButton: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
