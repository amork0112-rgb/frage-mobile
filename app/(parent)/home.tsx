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
import { getParentChildren, getRecentNotices, getParentRequests } from '../../lib/parent';

type Child = {
  id: string;
  student_name: string;
  english_first_name: string;
  campus: string;
  class_id: string;
};

type Notice = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

type PortalRequest = {
  id: string;
  type: string;
  payload: any;
  status: string;
  created_at: string;
  student_id: string;
};

export default function ParentHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [parentName, setParentName] = useState('');

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

      // Load recent notices
      const noticesData = await getRecentNotices(3);
      setNotices(noticesData);

      // Load recent portal requests
      const studentIds = childrenData.map((c) => c.id);
      const requestsData = await getParentRequests(studentIds);
      setRequests(requestsData);
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

  function handleContact() {
    Linking.openURL('http://pf.kakao.com/_TxdXxnG/chat');
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
    ? getChildName(firstChild)
    : parentName || '학부모';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요,</Text>
        <Text style={styles.name}>
          <Text style={styles.nameHighlight}>{displayName}</Text> 학부모님!
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

      {/* Children Cards */}
      {children.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>내 자녀</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childrenScroll}>
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={styles.childChip}
                onPress={() =>
                  router.push({
                    pathname: '/(parent)/child/[id]',
                    params: { id: child.id },
                  })
                }
              >
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>
                    {getChildName(child)[0] || '?'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.childChipName}>{getChildName(child)}</Text>
                  <Text style={styles.childChipGrade}>{child.campus}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
            onPress={() => {
              if (firstChild) {
                router.push({
                  pathname: '/(parent)/child/[id]',
                  params: { id: firstChild.id },
                });
              }
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="person-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.actionLabel}>학생 정보</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(parent)/coaching-report')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FAF5FF' }]}>
              <Ionicons name="book-outline" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.actionLabel}>코칭 리포트</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleContact}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#D97706" />
            </View>
            <Text style={styles.actionLabel}>상담/문의</Text>
          </TouchableOpacity>
        </View>
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

      {/* Recent Notices */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>공지사항</Text>
          <TouchableOpacity onPress={() => router.push('/(parent)/notices')}>
            <Text style={styles.viewAll}>전체보기</Text>
          </TouchableOpacity>
        </View>

        {notices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="megaphone-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyText}>공지사항이 없습니다</Text>
          </View>
        ) : (
          notices.map((notice) => (
            <TouchableOpacity
              key={notice.id}
              style={styles.noticeCard}
              onPress={() =>
                router.push({
                  pathname: '/(parent)/message/[id]',
                  params: { id: notice.id },
                })
              }
            >
              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle} numberOfLines={1}>
                  {notice.title}
                </Text>
                <Text style={styles.noticeBody} numberOfLines={2}>
                  {notice.content}
                </Text>
              </View>
              <Text style={styles.noticeDate}>{formatDate(notice.created_at)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Contact Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>카카오톡 상담 문의</Text>
        </TouchableOpacity>
        <Text style={styles.contactInfo}>입학/수업 관련 문의: 053-754-0577</Text>
      </View>

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

  // Header
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  greeting: {
    fontSize: 16,
    color: '#64748B',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  nameHighlight: {
    color: '#0066CC',
  },
  date: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
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

  // Children chips
  childrenScroll: {
    marginHorizontal: -4,
  },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  childAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  childChipName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  childChipGrade: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },

  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
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

  // Notices
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noticeContent: {
    flex: 1,
    marginRight: 12,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  noticeDate: {
    fontSize: 12,
    color: '#94A3B8',
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
});
