import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Class = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  name: string;
  english_name: string;
};

export default function SendCommitments() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [commitment, setCommitment] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass);
    } else {
      setStudents([]);
      setSelectedStudent(null);
    }
  }, [selectedClass]);

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

      const { data } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', teacher.email)
        .order('name');

      if (data) {
        setClasses(data);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents(classId: string) {
    try {
      const { data } = await supabase
        .from('students')
        .select('id, name, english_name')
        .eq('class_id', classId)
        .order('name');

      if (data) {
        setStudents(data);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  }

  async function handleSubmit() {
    if (!selectedStudent) {
      Alert.alert('Error', 'Please select a student');
      return;
    }

    if (!commitment.trim()) {
      Alert.alert('Error', 'Please enter a commitment');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('commitments').insert({
        student_id: selectedStudent,
        content: commitment.trim(),
        date: date,
      });

      if (error) throw error;

      Alert.alert('Success', 'Commitment sent successfully');
      setCommitment('');
      setSelectedStudent(null);
      setSelectedClass(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send commitment');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Class</Text>
        <View style={styles.optionsContainer}>
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={[
                styles.optionButton,
                selectedClass === cls.id && styles.optionButtonSelected,
              ]}
              onPress={() => setSelectedClass(cls.id)}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedClass === cls.id && styles.optionTextSelected,
                ]}
              >
                {cls.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {students.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Select Student</Text>
            <View style={styles.optionsContainer}>
              {students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={[
                    styles.optionButton,
                    selectedStudent === student.id && styles.optionButtonSelected,
                  ]}
                  onPress={() => setSelectedStudent(student.id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedStudent === student.id && styles.optionTextSelected,
                    ]}
                  >
                    {student.english_name || student.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {selectedStudent && (
          <>
            <Text style={styles.sectionTitle}>Date</Text>
            <TextInput
              style={styles.dateInput}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              editable={!submitting}
            />

            <Text style={styles.sectionTitle}>Commitment</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter commitment..."
              value={commitment}
              onChangeText={setCommitment}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!submitting}
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Send Commitment</Text>
              )}
            </TouchableOpacity>
          </>
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
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  optionButtonSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  optionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  dateInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
