import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { getStudentDetails } from '../../../lib/teacher';

interface StudentDetails {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  attendance_percentage: number;
  recent_attendance: Array<{
    date: string;
    status: string;
  }>;
}

export default function StudentDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentDetails();
  }, [id]);

  async function loadStudentDetails() {
    try {
      const studentData = await getStudentDetails(id as string);
      setStudent(studentData);
    } catch (error) {
      console.error('Error loading student details:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load student details</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${student.first_name} ${student.last_name}`,
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {student.first_name[0]}
              {student.last_name[0]}
            </Text>
          </View>
          <Text style={styles.name}>
            {student.first_name} {student.last_name}
          </Text>
          <Text style={styles.grade}>Grade {student.grade}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parent Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{student.parent_name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {student.parent_email}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{student.parent_phone || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance</Text>
          <View style={styles.attendanceCard}>
            <View style={styles.attendanceHeader}>
              <Text style={styles.attendancePercentage}>
                {student.attendance_percentage.toFixed(1)}%
              </Text>
              <Text style={styles.attendanceLabel}>Attendance Rate</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.recentAttendance}>
              {student.recent_attendance.map((record, index) => (
                <View key={index} style={styles.attendanceRow}>
                  <Text style={styles.attendanceDate}>
                    {new Date(record.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    record.status === 'present'
                      ? styles.presentBadge
                      : styles.absentBadge
                  ]}>
                    <Text style={styles.statusText}>
                      {record.status === 'present' ? 'Present' : 'Absent'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              router.push({
                pathname: '/(teacher)/messages/new',
                params: { studentId: student.id },
              })
            }
          >
            <Ionicons name="chatbubble-outline" size={24} color="#0066CC" />
            <Text style={styles.actionButtonText}>Message Parent</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
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
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '600',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  grade: {
    fontSize: 16,
    color: '#64748B',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  attendanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  attendanceHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  attendancePercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  attendanceLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  recentAttendance: {
    paddingTop: 12,
    gap: 8,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  attendanceDate: {
    fontSize: 14,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  presentBadge: {
    backgroundColor: '#D1FAE5',
  },
  absentBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
    marginLeft: 8,
  },
});
