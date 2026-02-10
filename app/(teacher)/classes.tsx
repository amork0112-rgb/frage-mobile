import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Class = {
  id: string;
  name: string;
  teacher_id: string;
  student_count?: number;
};

type Student = {
  id: string;
  name: string;
  english_name: string;
  campus: string;
};

export default function Classes() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teacher email
      const { data: teacher } = await supabase
        .from('teachers')
        .select('email')
        .eq('auth_user_id', user.id)
        .single();

      if (!teacher) return;

      // Load classes
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, teacher_id')
        .eq('teacher_id', teacher.email)
        .order('name');

      if (classData) {
        // Count students for each class
        const classesWithCounts = await Promise.all(
          classData.map(async (cls) => {
            const { count } = await supabase
              .from('students')
              .select('id', { count: 'exact', head: true })
              .eq('class_id', cls.id);

            return { ...cls, student_count: count || 0 };
          })
        );

        setClasses(classesWithCounts);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadStudents(classId: string) {
    setLoadingStudents(true);
    try {
      const { data } = await supabase
        .from('students')
        .select('id, name, english_name, campus')
        .eq('class_id', classId)
        .order('name');

      if (data) {
        setStudents(data);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoadingStudents(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadClasses();
  }

  function handleClassPress(cls: Class) {
    setSelectedClass(cls);
    loadStudents(cls.id);
  }

  function renderClass({ item }: { item: Class }) {
    return (
      <TouchableOpacity
        style={styles.classItem}
        onPress={() => handleClassPress(item)}
      >
        <View style={styles.classInfo}>
          <Text style={styles.className}>{item.name}</Text>
          <Text style={styles.studentCount}>
            {item.student_count || 0} student{item.student_count !== 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>
    );
  }

  function renderStudent({ item }: { item: Student }) {
    return (
      <View style={styles.studentItem}>
        <View>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentEnglishName}>{item.english_name}</Text>
        </View>
        <Text style={styles.campus}>{item.campus}</Text>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={classes}
        renderItem={renderClass}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No classes found</Text>
          </View>
        }
      />

      <Modal
        visible={selectedClass !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedClass(null)}
      >
        {selectedClass && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedClass.name}</Text>
              <TouchableOpacity onPress={() => setSelectedClass(null)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>
            {loadingStudents ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0066CC" />
              </View>
            ) : (
              <FlatList
                data={students}
                renderItem={renderStudent}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modalListContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No students in this class</Text>
                  </View>
                }
              />
            )}
          </View>
        )}
      </Modal>
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
  listContent: {
    padding: 16,
  },
  classItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  studentCount: {
    fontSize: 14,
    color: '#64748B',
  },
  arrow: {
    fontSize: 20,
    color: '#94A3B8',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  closeButton: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  modalListContent: {
    padding: 16,
  },
  studentItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  studentEnglishName: {
    fontSize: 13,
    color: '#64748B',
  },
  campus: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
});
