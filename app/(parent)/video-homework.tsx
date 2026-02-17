import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getParentChildren, getVideoAssignments } from '../../lib/parent';

type Child = {
  id: string;
  student_name: string;
  english_first_name: string;
  main_class: string;
};

type VideoAssignment = {
  id: string;
  title: string;
  module: string;
  class_name: string;
  campus: string;
  due_date: string;
  created_at: string;
  release_at: string;
  submission: {
    id: string;
    status: string;
    submitted_at: string;
  } | null;
  status: 'pending' | 'submitted' | 'reviewed';
};

export default function VideoHomework() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<VideoAssignment[]>([]);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadAssignments(selectedChildId);
    }
  }, [selectedChildId]);

  async function loadChildren() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const childrenData = await getParentChildren(user.id);
      if (childrenData.length > 0) {
        setChildren(childrenData);
        setSelectedChildId(childrenData[0].id);
      }
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignments(studentId: string) {
    try {
      const data = await getVideoAssignments(studentId);
      setAssignments(data as VideoAssignment[]);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    if (selectedChildId) {
      loadAssignments(selectedChildId);
    }
  }

  function getStatusBadgeStyle(status: string) {
    switch (status) {
      case 'pending':
        return { backgroundColor: '#FEF3C7', color: '#F59E0B' };
      case 'submitted':
        return { backgroundColor: '#DBEAFE', color: '#0066CC' };
      case 'reviewed':
        return { backgroundColor: '#D1FAE5', color: '#10B981' };
      default:
        return { backgroundColor: '#F1F5F9', color: '#64748B' };
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'pending':
        return '제출 필요';
      case 'submitted':
        return '제출 완료';
      case 'reviewed':
        return '검토 완료';
      default:
        return '';
    }
  }

  function isOverdue(dueDate: string) {
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
  }

  function handleRecordPress(assignmentId: string) {
    if (!selectedChildId) return;
    router.push(`/(parent)/video-homework/record?assignment_id=${assignmentId}&student_id=${selectedChildId}`);
  }

  function handleViewPress(submissionId: string) {
    router.push(`/(parent)/video-homework/submission/${submissionId}`);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
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
        <Text style={styles.title}>Video Homework</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Child Selector */}
      {children.length > 1 && (
        <View style={styles.siblingContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.siblingScroll}
          >
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.siblingButton,
                  selectedChildId === child.id && styles.siblingButtonActive,
                ]}
                onPress={() => setSelectedChildId(child.id)}
              >
                <Text
                  style={[
                    styles.siblingButtonText,
                    selectedChildId === child.id &&
                      styles.siblingButtonTextActive,
                  ]}
                >
                  {child.english_first_name || child.student_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Assignments List */}
      <View style={styles.listContainer}>
        {assignments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>아직 영상 숙제가 없습니다</Text>
          </View>
        ) : (
          assignments.map((assignment) => (
            <View key={assignment.id} style={styles.assignmentCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getStatusBadgeStyle(assignment.status)
                        .backgroundColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusBadgeStyle(assignment.status).color },
                    ]}
                  >
                    {getStatusLabel(assignment.status)}
                  </Text>
                </View>
              </View>

              {assignment.module && (
                <Text style={styles.assignmentDescription} numberOfLines={2}>
                  {assignment.module}
                </Text>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.dateContainer}>
                  <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                  <Text
                    style={[
                      styles.dueDate,
                      assignment.status === 'pending' &&
                        isOverdue(assignment.due_date) &&
                        styles.dueDateOverdue,
                    ]}
                  >
                    마감: {formatDate(assignment.due_date)}
                    {assignment.status === 'pending' &&
                      isOverdue(assignment.due_date) &&
                      ' (기한 초과)'}
                  </Text>
                </View>

                {assignment.status === 'pending' ? (
                  <TouchableOpacity
                    style={styles.recordButton}
                    onPress={() => handleRecordPress(assignment.id)}
                  >
                    <Ionicons name="videocam" size={18} color="#FFFFFF" />
                    <Text style={styles.recordButtonText}>녹화하기</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() =>
                      handleViewPress(assignment.submission?.id || '')
                    }
                  >
                    <Ionicons name="play-circle-outline" size={18} color="#0066CC" />
                    <Text style={styles.viewButtonText}>보기</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  loadingContainer: {
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  siblingContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  siblingScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  siblingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  siblingButtonActive: {
    backgroundColor: '#0066CC',
  },
  siblingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  siblingButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
  },
  assignmentCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDate: {
    fontSize: 13,
    color: '#94A3B8',
  },
  dueDateOverdue: {
    color: '#EF4444',
    fontWeight: '600',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  recordButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
  },
});
