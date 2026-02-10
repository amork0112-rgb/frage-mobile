import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Commitment = {
  id: string;
  content: string;
  date: string;
  created_at: string;
};

export default function Commitments() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommitment, setNewCommitment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get student ID
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('parent_auth_user_id', user.id)
        .limit(1);

      if (students && students.length > 0) {
        const sid = students[0].id;
        setStudentId(sid);

        // Load commitments
        const { data: commitmentData } = await supabase
          .from('commitments')
          .select('id, content, date, created_at')
          .eq('student_id', sid)
          .order('date', { ascending: false })
          .limit(50);

        if (commitmentData) {
          setCommitments(commitmentData);
        }
      }
    } catch (error) {
      console.error('Error loading commitments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  async function handleSubmit() {
    if (!newCommitment.trim()) {
      Alert.alert('Error', 'Please enter a commitment');
      return;
    }

    if (!studentId) {
      Alert.alert('Error', 'Student information not found');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase.from('commitments').insert({
        student_id: studentId,
        content: newCommitment.trim(),
        date: today,
      });

      if (error) throw error;

      Alert.alert('Success', 'Commitment submitted successfully');
      setNewCommitment('');
      setShowCreateModal(false);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit commitment');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function renderCommitment({ item }: { item: Commitment }) {
    return (
      <View style={styles.commitmentItem}>
        <View style={styles.commitmentHeader}>
          <Text style={styles.commitmentDate}>{formatDate(item.date)}</Text>
        </View>
        <Text style={styles.commitmentContent}>{item.content}</Text>
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
        data={commitments}
        renderItem={renderCommitment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No commitments yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the button below to create one
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Commitment</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.closeButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your commitment..."
              value={newCommitment}
              onChangeText={setNewCommitment}
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
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: 80,
  },
  commitmentItem: {
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
  commitmentHeader: {
    marginBottom: 8,
  },
  commitmentDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  commitmentContent: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
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
