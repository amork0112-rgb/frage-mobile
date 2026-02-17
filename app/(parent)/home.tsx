import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getParentChildren, getParentRequests } from '../../lib/parent';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

type Child = {
  id: string;
  student_name: string;
  english_first_name: string;
  campus: string;
  main_class: string;
};

type PortalRequest = {
  id: string;
  type: string;
  payload: any;
  status: string;
  created_at: string;
  student_id: string;
};

type ClassMessage = {
  id: string;
  content: string;
  created_at: string;
  class_name: string;
};

type CoachingReport = {
  id: string;
  student_name: string;
  date: string;
  summary: string;
};

const FAB_ITEMS: { key: string; label: string; icon: string; color: string }[] = [
  { key: 'absence', label: '결석 신청', icon: 'close-circle-outline', color: '#EF4444' },
  { key: 'early_pickup', label: '조퇴 신청', icon: 'time-outline', color: '#F59E0B' },
  { key: 'bus_change', label: '차량 변경', icon: 'bus-outline', color: '#0066CC' },
];

export default function ParentHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [morningMessages, setMorningMessages] = useState<ClassMessage[]>([]);
  const [coachingReports, setCoachingReports] = useState<CoachingReport[]>([]);
  const [parentName, setParentName] = useState('');
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get parent info
      const { data: parent } = await supabase
        .from('parents')
        .select('name')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (parent) {
        setParentName(parent.name || '');
      }

      // Load children
      const childrenData = await getParentChildren(user.id);
      setChildren(childrenData);

      // Load recent portal requests
      const studentIds = childrenData.map((c) => c.id);
      const requestsData = await getParentRequests(studentIds);
      setRequests(requestsData);

      // Load today's morning messages for children's classes
      const classIds = childrenData
        .map((c) => c.main_class)
        .filter(Boolean);

      if (classIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const { data: msgs } = await supabase
          .from('class_messages')
          .select('id, content, created_at, class_id, classes(name)')
          .in('class_id', classIds)
          .gte('created_at', today)
          .order('created_at', { ascending: false })
          .limit(5);

        setMorningMessages(
          (msgs || []).map((m: any) => ({
            id: m.id,
            content: m.content || '',
            created_at: m.created_at,
            class_name: (m.classes as any)?.name || '',
          }))
        );
      }

      // Load recent coaching reports (daily_reports)
      if (studentIds.length > 0) {
        const { data: reports } = await supabase
          .from('daily_reports')
          .select('id, student_id, date, content')
          .in('student_id', studentIds)
          .order('date', { ascending: false })
          .limit(5);

        setCoachingReports(
          (reports || []).map((r: any) => {
            const child = childrenData.find((c) => c.id === r.student_id);
            return {
              id: r.id,
              student_name: child
                ? child.student_name || child.english_first_name || ''
                : '',
              date: r.date,
              summary: r.content || '',
            };
          })
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  function getChildName(child: Child) {
    return child.english_first_name || child.student_name || '';
  }

  function getRequestTypeLabel(type: string) {
    switch (type) {
      case 'absence': return '결석';
      case 'early_pickup': return '조퇴';
      case 'bus_change': return '차량 변경';
      case 'medication': return '투약';
      default: return type;
    }
  }

  function getRequestStatusLabel(status: string) {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '승인';
      case 'rejected': return '반려';
      default: return status;
    }
  }

  function getRequestStatusColor(status: string) {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#94A3B8';
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}/${day}`;
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  const firstChild = children[0];
  const displayName = firstChild
    ? firstChild.student_name || firstChild.english_first_name || '학생'
    : parentName || '학부모';

  return (
    <View style={styles.rootContainer}>
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          안녕하세요, <Text style={styles.nameHighlight}>{displayName}</Text> 학부모님!
        </Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </Text>
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>빠른 메뉴</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(parent)/request')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="calendar-outline" size={24} color="#EF4444" />
            </View>
            <Text style={styles.actionLabel}>결석/조퇴{'\n'}신청</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(parent)/request')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="bus-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.actionLabel}>차량 변경{'\n'}요청</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(parent)/notices')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="megaphone-outline" size={24} color="#0066CC" />
            </View>
            <Text style={styles.actionLabel}>공지사항</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => Linking.openURL('https://www.frage.co.kr/calendar')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="calendar" size={24} color="#10B981" />
            </View>
            <Text style={styles.actionLabel}>학사일정</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* Today's Morning Messages */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>오늘의 알림장</Text>
        </View>
        {morningMessages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyText}>오늘은 새로운 알림이 없습니다</Text>
          </View>
        ) : (
          morningMessages.map((msg) => (
            <View key={msg.id} style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <View style={styles.classBadge}>
                  <Text style={styles.classBadgeText}>{msg.class_name}</Text>
                </View>
                <Text style={styles.messageTime}>
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.messageContent} numberOfLines={4}>
                {stripHtml(msg.content)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Coaching Reports */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 코칭 리포트</Text>
          <TouchableOpacity onPress={() => router.push('/(parent)/coaching-report')}>
            <Text style={styles.viewAll}>전체보기</Text>
          </TouchableOpacity>
        </View>
        {coachingReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="book-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyText}>코칭 리포트가 없습니다</Text>
          </View>
        ) : (
          coachingReports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportStudent}>{report.student_name}</Text>
                <Text style={styles.reportDate}>{report.date}</Text>
              </View>
              <Text style={styles.reportSummary} numberOfLines={3}>
                {stripHtml(report.summary)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Recent Requests */}
      {requests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 신청 내역</Text>
          </View>
          {requests.slice(0, 3).map((req) => {
            const payload = typeof req.payload === 'string'
              ? JSON.parse(req.payload)
              : req.payload;
            const child = children.find((c) => c.id === req.student_id);

            return (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestLeft}>
                  <View style={styles.requestTypeRow}>
                    <Text style={styles.requestType}>
                      {getRequestTypeLabel(req.type)}
                    </Text>
                    {child && (
                      <Text style={styles.requestStudent}>
                        {getChildName(child)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.requestDate}>
                    {payload?.dateStart || formatDate(req.created_at)}
                    {payload?.time ? ` · ${payload.time}` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getRequestStatusColor(req.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getRequestStatusColor(req.status) },
                    ]}
                  >
                    {getRequestStatusLabel(req.status)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}


      {/* Contact */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL('http://pf.kakao.com/_QGQvxj/chat')}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>카카오톡 상담 문의</Text>
        </TouchableOpacity>
        <Text style={styles.contactInfo}>입학/수업 관련 문의: 053-754-0577</Text>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>

    {/* FAB Overlay */}
    {fabOpen && (
      <TouchableOpacity
        style={styles.fabOverlay}
        activeOpacity={1}
        onPress={() => setFabOpen(false)}
      />
    )}

    {/* FAB Menu */}
    {fabOpen && (
      <View style={styles.fabMenu}>
        {FAB_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.fabMenuItem}
            onPress={() => {
              setFabOpen(false);
              router.push('/(parent)/request');
            }}
          >
            <Text style={styles.fabMenuLabel}>{item.label}</Text>
            <View style={[styles.fabMenuIcon, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon as any} size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    )}

    {/* FAB Button */}
    <TouchableOpacity
      style={[styles.fab, fabOpen && styles.fabActive]}
      onPress={() => setFabOpen(!fabOpen)}
      activeOpacity={0.8}
    >
      <Ionicons name={fabOpen ? 'close' : 'add'} size={28} color="#FFFFFF" />
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
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

  // Header
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  nameHighlight: {
    color: '#0066CC',
    fontWeight: '800',
  },
  date: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
  },

  // Sections
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 12,
  },

  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionCard: {
    width: '22.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Morning Messages
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  classBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  classBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0066CC',
  },
  messageTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  messageContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },

  // Coaching Reports
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportStudent: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  reportDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  reportSummary: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },

  // Requests
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  requestLeft: {
    flex: 1,
  },
  requestTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  requestStudent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066CC',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requestDate: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
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

  // Empty state
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 12,
  },

  // Contact
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C1E1E',
  },
  contactInfo: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 12,
  },

  // FAB
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabActive: {
    backgroundColor: '#64748B',
    shadowColor: '#64748B',
  },
  fabMenu: {
    position: 'absolute',
    right: 20,
    bottom: 92,
    alignItems: 'flex-end',
    gap: 10,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fabMenuLabel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  fabMenuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
