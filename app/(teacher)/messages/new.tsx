import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { getTeacherStudents, sendMessage } from '../../../lib/teacher';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  parent_id: string;
  parent_name: string;
}

export default function NewMessage() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(
    (studentId as string) || null
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const studentsData = await getTeacherStudents(user.id);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!selectedStudent) {
      Alert.alert('Error', 'Please select a student');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const student = students.find((s) => s.id === selectedStudent);
      if (!student) return;

      await sendMessage(user.id, student.parent_id, selectedStudent, subject, body);

      Alert.alert('Success', 'Message sent successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  const selectedStudentData = students.find((s) => s.id === selectedStudent);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Message',
          headerBackTitle: 'Cancel',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>To (Parent)</Text>
            <View style={styles.pickerContainer}>
              {selectedStudentData ? (
                <TouchableOpacity
                  style={styles.selectedStudent}
                  onPress={() => setSelectedStudent(null)}
                >
                  <View>
                    <Text style={styles.selectedStudentName}>
                      {selectedStudentData.parent_name}
                    </Text>
                    <Text style={styles.selectedStudentMeta}>
                      Parent of {selectedStudentData.first_name}{' '}
                      {selectedStudentData.last_name}
                    </Text>
                  </View>
                  <Ionicons name="close-circle" size={24} color="#94A3B8" />
                </TouchableOpacity>
              ) : (
                <View style={styles.studentsList}>
                  {students.map((student) => (
                    <TouchableOpacity
                      key={student.id}
                      style={styles.studentOption}
                      onPress={() => setSelectedStudent(student.id)}
                    >
                      <View style={styles.studentOptionContent}>
                        <Text style={styles.studentOptionParent}>
                          {student.parent_name}
                        </Text>
                        <Text style={styles.studentOptionChild}>
                          Parent of {student.first_name} {student.last_name}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter subject"
              value={subject}
              onChangeText={setSubject}
              editable={!sending}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter your message"
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!sending}
            />
          </View>

          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            <Ionicons
              name="send"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.sendButtonText}>
              {sending ? 'Sending...' : 'Send Message'}
            </Text>
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
  form: {
    padding: 16,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedStudent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  selectedStudentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  selectedStudentMeta: {
    fontSize: 14,
    color: '#64748B',
  },
  studentsList: {
    maxHeight: 300,
  },
  studentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  studentOptionContent: {
    flex: 1,
  },
  studentOptionParent: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 4,
  },
  studentOptionChild: {
    fontSize: 14,
    color: '#64748B',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  textArea: {
    minHeight: 160,
    paddingTop: 16,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
