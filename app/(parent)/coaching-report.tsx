import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// Types
type Child = {
  id: string;
  student_name: string;
  english_first_name: string;
  main_class: string;
};

type CommitmentItem = {
  id: string;
  book_id: string;
  book_name: string;
  status: 'unchecked' | 'done' | 'partial' | 'not_done';
  note: string;
};

type SendStatus = 'pending' | 'sent' | null;

export default function CoachingReport() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [commitments, setCommitments] = useState<CommitmentItem[]>([]);
  const [sendStatus, setSendStatus] = useState<SendStatus>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId && selectedDate) {
      loadReport(selectedChildId, selectedDate);
    }
  }, [selectedChildId, selectedDate]);

  async function loadChildren() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: students } = await supabase
        .from('students')
        .select('id, student_name, english_first_name, main_class')
        .eq('parent_auth_user_id', user.id);

      if (students && students.length > 0) {
        setChildren(students);
        setSelectedChildId(students[0].id);
      }
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReport(studentId: string, date: string) {
    setLoadingReport(true);
    try {
      // 1) Get student_commitments for this student + date
      const { data: scData } = await supabase
        .from('student_commitments')
        .select('id, book_id, status, note')
        .eq('student_id', studentId)
        .eq('date', date);

      if (scData && scData.length > 0) {
        // 2) Get book names for all referenced book_ids
        const bookIds = [
          ...new Set(scData.map((sc) => sc.book_id).filter(Boolean)),
        ];
        const bookMap: Record<string, string> = {};

        if (bookIds.length > 0) {
          const { data: books } = await supabase
            .from('books')
            .select('id, name')
            .in('id', bookIds);

          (books || []).forEach((b: any) => {
            bookMap[b.id] = b.name;
          });
        }

        const items: CommitmentItem[] = scData.map((sc: any) => ({
          id: sc.id,
          book_id: sc.book_id,
          book_name: bookMap[sc.book_id] || '과목 미지정',
          status: sc.status || 'unchecked',
          note: sc.note || '',
        }));

        setCommitments(items);
      } else {
        setCommitments([]);
      }

      // 3) Check daily_reports send status
      const child = children.find((c) => c.id === studentId);
      const classId = child?.main_class;

      if (classId) {
        const { data: report } = await supabase
          .from('daily_reports')
          .select('send_status')
          .eq('student_id', studentId)
          .eq('class_id', classId)
          .eq('date', date)
          .maybeSingle();

        setSendStatus(report?.send_status || null);
      } else {
        setSendStatus(null);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoadingReport(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedChildId && selectedDate) {
      loadReport(selectedChildId, selectedDate);
    } else {
      setRefreshing(false);
    }
  }, [selectedChildId, selectedDate]);

  function changeDate(days: number) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'done':
        return '✅';
      case 'partial':
        return '🟨';
      case 'not_done':
        return '❌';
      case 'unchecked':
      default:
        return '⬜';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'done':
        return '완료';
      case 'partial':
        return '부분 완료';
      case 'not_done':
        return '미완료';
      case 'unchecked':
      default:
        return '미확인';
    }
  }

  function getChildName(child: Child) {
    return child.english_first_name || child.student_name || '';
  }

  const isToday =
    selectedDate === new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>등록된 학생이 없습니다</Text>
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
      {/* Sibling Switcher */}
      {children.length > 1 && (
        <View style={styles.siblingRow}>
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[
                styles.siblingPill,
                selectedChildId === child.id && styles.siblingPillSelected,
              ]}
              onPress={() => setSelectedChildId(child.id)}
            >
              <Text
                style={[
                  styles.siblingPillText,
                  selectedChildId === child.id &&
                    styles.siblingPillTextSelected,
                ]}
              >
                {getChildName(child)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Date Picker */}
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={styles.dateArrow}
          onPress={() => changeDate(-1)}
        >
          <Ionicons name="chevron-back" size={24} color="#0066CC" />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          {!isToday && (
            <TouchableOpacity
              onPress={() =>
                setSelectedDate(new Date().toISOString().split('T')[0])
              }
            >
              <Text style={styles.todayLink}>오늘로 이동</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.dateArrow}
          onPress={() => changeDate(1)}
          disabled={isToday}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isToday ? '#CBD5E1' : '#0066CC'}
          />
        </TouchableOpacity>
      </View>

      {/* Send Status Banner */}
      <View
        style={[
          styles.sendBanner,
          sendStatus === 'sent'
            ? styles.sendBannerSent
            : styles.sendBannerPending,
        ]}
      >
        <Ionicons
          name={
            sendStatus === 'sent' ? 'checkmark-circle' : 'time-outline'
          }
          size={18}
          color={sendStatus === 'sent' ? '#10B981' : '#F59E0B'}
        />
        <Text
          style={[
            styles.sendBannerText,
            sendStatus === 'sent'
              ? styles.sendBannerTextSent
              : styles.sendBannerTextPending,
          ]}
        >
          {sendStatus === 'sent'
            ? '오늘 코칭 브리핑 전송 완료'
            : '아직 전송 전'}
        </Text>
      </View>

      {/* Commitment Items */}
      {loadingReport ? (
        <ActivityIndicator
          size="small"
          color="#0066CC"
          style={{ marginTop: 32 }}
        />
      ) : commitments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="document-text-outline"
            size={40}
            color="#CBD5E1"
          />
          <Text style={styles.emptyCardTitle}>다짐 기록이 없습니다</Text>
          <Text style={styles.emptyCardSubtext}>
            이 날짜에 등록된 코칭 내역이 없습니다
          </Text>
        </View>
      ) : (
        <View style={styles.commitmentList}>
          {commitments.map((item) => (
            <View key={item.id} style={styles.commitmentCard}>
              <View style={styles.commitmentRow}>
                <Text style={styles.statusIcon}>
                  {getStatusIcon(item.status)}
                </Text>
                <View style={styles.commitmentInfo}>
                  <Text style={styles.bookName}>{item.book_name}</Text>
                  <Text
                    style={[
                      styles.statusLabel,
                      item.status === 'done' && styles.statusDone,
                      item.status === 'partial' && styles.statusPartial,
                      item.status === 'not_done' && styles.statusNotDone,
                      item.status === 'unchecked' &&
                        styles.statusUnchecked,
                    ]}
                  >
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
              {item.note ? (
                <Text style={styles.noteText}>{item.note}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
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

  // Sibling Switcher
  siblingRow: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 0,
    gap: 8,
  },
  siblingPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  siblingPillSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  siblingPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  siblingPillTextSelected: {
    color: '#FFFFFF',
  },

  // Date Picker
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateArrow: {
    padding: 4,
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  todayLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066CC',
    marginTop: 4,
  },

  // Send Status Banner
  sendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  sendBannerSent: {
    backgroundColor: '#F0FDF4',
  },
  sendBannerPending: {
    backgroundColor: '#FFFBEB',
  },
  sendBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sendBannerTextSent: {
    color: '#10B981',
  },
  sendBannerTextPending: {
    color: '#F59E0B',
  },

  // Commitment List
  commitmentList: {
    padding: 16,
    gap: 10,
  },
  commitmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commitmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    fontSize: 22,
  },
  commitmentInfo: {
    flex: 1,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statusDone: {
    color: '#10B981',
  },
  statusPartial: {
    color: '#F59E0B',
  },
  statusNotDone: {
    color: '#EF4444',
  },
  statusUnchecked: {
    color: '#94A3B8',
  },
  noteText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    lineHeight: 18,
  },

  // Empty States
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  emptyCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
  },
  emptyCardSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
});
