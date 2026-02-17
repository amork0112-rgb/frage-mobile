import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { getVideoSubmission } from '../../../../lib/parent';

type SubmissionData = {
  id: string;
  assignment_id: string;
  video_url: string;
  submitted_at: string;
  status: string;
  assignment: {
    title: string;
    module: string;
    class_name: string;
    campus: string;
    due_date: string;
    release_at: string;
  } | null;
  feedback: {
    feedback_text: string;
    created_at: string;
  } | null;
};

export default function SubmissionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<SubmissionData | null>(null);

  useEffect(() => {
    loadSubmission();
  }, [id]);

  async function loadSubmission() {
    try {
      const data = await getVideoSubmission(id);
      setSubmission(data);
    } catch (error) {
      console.error('Error loading submission:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadgeStyle(status: string) {
    switch (status) {
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
      case 'submitted':
        return '제출 완료';
      case 'reviewed':
        return '검토 완료';
      default:
        return '';
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: '제출 내역' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
        </View>
      </>
    );
  }

  if (!submission) {
    return (
      <>
        <Stack.Screen options={{ title: '제출 내역' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CBD5E1" />
          <Text style={styles.errorText}>제출 내역을 찾을 수 없습니다</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: submission.assignment?.title || '제출 내역' }}
      />

      <ScrollView style={styles.container}>
        {/* Assignment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>과제 정보</Text>
          <View style={styles.card}>
            <Text style={styles.assignmentTitle}>
              {submission.assignment?.title}
            </Text>
            {submission.assignment?.module && (
              <Text style={styles.assignmentDescription}>
                {submission.assignment.module}
              </Text>
            )}
            {submission.assignment?.due_date && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
                <Text style={styles.infoText}>
                  마감: {formatDate(submission.assignment.due_date)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Submission Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제출 정보</Text>
          <View style={styles.card}>
            <View style={styles.submissionHeader}>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.infoText}>
                  제출: {formatDate(submission.submitted_at)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusBadgeStyle(submission.status)
                      .backgroundColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusBadgeStyle(submission.status).color },
                  ]}
                >
                  {getStatusLabel(submission.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Video Player */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제출 영상</Text>
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: submission.video_url }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
            />
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>선생님 피드백</Text>
          {submission.feedback ? (
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#0066CC" />
                <Text style={styles.feedbackDate}>
                  {formatDate(submission.feedback.created_at)}
                </Text>
              </View>
              <Text style={styles.feedbackText}>
                {submission.feedback.feedback_text}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyFeedback}>
              <Ionicons name="time-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyFeedbackText}>
                아직 검토 전입니다
              </Text>
              <Text style={styles.emptyFeedbackSubtext}>
                선생님이 영상을 확인하신 후 피드백을 남겨주실 거예요
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  videoContainer: {
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  feedbackDate: {
    fontSize: 13,
    color: '#94A3B8',
  },
  feedbackText: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 22,
  },
  emptyFeedback: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyFeedbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyFeedbackSubtext: {
    fontSize: 14,
    color: '#CBD5E1',
    marginTop: 8,
    textAlign: 'center',
  },
});
