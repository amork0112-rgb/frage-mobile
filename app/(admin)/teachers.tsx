import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Teacher = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function AdminTeachers() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    loadTeachers();
  }, []);

  async function loadTeachers() {
    try {
      const { data } = await supabase
        .from('teachers')
        .select('id, name, email, role')
        .order('name');

      if (data) {
        setTeachers(data);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadTeachers();
  }

  function renderTeacher({ item }: { item: Teacher }) {
    return (
      <View style={styles.teacherItem}>
        <View style={styles.teacherInfo}>
          <Text style={styles.teacherName}>{item.name}</Text>
          <Text style={styles.teacherEmail}>{item.email}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{item.role}</Text>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={teachers}
        renderItem={renderTeacher}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No teachers found</Text>
          </View>
        }
      />
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
  teacherItem: {
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
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  teacherEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  roleBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
});
