import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// Types
type TimeSlot = {
  id: string;
  label: string;
  departure_time: string;
  route_type: string;
};

type StudentInfo = {
  id: string;
  name: string;
  phone: string;
};

type StopBlock = {
  blockId: string;
  label: string;
  time: string;
  students: StudentInfo[];
};

type OperationState = 'idle' | 'running' | 'ended';

export default function DriverHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [busId, setBusId] = useState<string | null>(null);

  // Slot selection
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Route data
  const [stopBlocks, setStopBlocks] = useState<StopBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  // Operation state
  const [operation, setOperation] = useState<OperationState>('idle');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSlotId && busId) {
      loadRouteBlocks(selectedSlotId, busId);
    }
  }, [selectedSlotId, busId]);

  async function loadInitialData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.name) setDriverName(profile.name);

      // Load available time slots
      const { data: slots } = await supabase
        .from('transport_time_slots')
        .select('id, label, departure_time, route_type')
        .order('departure_time');

      setTimeSlots(slots || []);
    } catch (error) {
      console.error('Error loading driver data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadRouteBlocks(slotId: string, driverBusId: string) {
    setLoadingBlocks(true);
    try {
      // Find the bus route for this bus + slot
      const { data: route } = await supabase
        .from('bus_routes')
        .select('id')
        .eq('bus_id', driverBusId)
        .eq('slot_id', slotId)
        .maybeSingle();

      if (!route) {
        setStopBlocks([]);
        setLoadingBlocks(false);
        return;
      }

      // Get route blocks with nested students and parent phone
      const { data: blocks } = await supabase
        .from('route_blocks')
        .select(
          `id, label, block_order, estimated_extra_time,
          route_block_students (
            students (
              id, student_name, english_first_name,
              parents ( phone )
            )
          )`
        )
        .eq('route_id', route.id)
        .order('block_order');

      // Get today's absent / early pickup students to filter out
      const today = new Date().toISOString().split('T')[0];
      const { data: absentRequests } = await supabase
        .from('portal_requests')
        .select('student_id, payload')
        .in('type', ['absence', 'early_pickup'])
        .eq('status', 'pending');

      const absentIds = new Set<string>();
      (absentRequests || []).forEach((r: any) => {
        const payload =
          typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
        const dateStart = payload?.dateStart;
        const dateEnd = payload?.dateEnd;
        const isToday = dateEnd
          ? today >= dateStart && today <= dateEnd
          : today === dateStart;
        if (isToday && r.student_id) absentIds.add(r.student_id);
      });

      // Calculate accumulated times from departure
      const slot = timeSlots.find((s) => s.id === slotId);
      const baseTime = slot?.departure_time || '00:00';

      let accumulated = 0;
      const result: StopBlock[] = (blocks || []).map((block: any) => {
        accumulated += block.estimated_extra_time || 0;
        const time = addMinutes(baseTime, accumulated);

        const students: StudentInfo[] = (block.route_block_students || [])
          .map((rbs: any) => rbs.students)
          .filter((s: any) => s && !absentIds.has(s.id))
          .map((s: any) => ({
            id: s.id,
            name:
              s.student_name || s.english_first_name || '이름 없음',
            phone: s.parents?.phone || '',
          }));

        return {
          blockId: block.id,
          label: block.label,
          time,
          students,
        };
      });

      setStopBlocks(result);
    } catch (error) {
      console.error('Error loading route blocks:', error);
    } finally {
      setLoadingBlocks(false);
    }
  }

  function addMinutes(time: string, minutes: number): string {
    const parts = time.split(':').map(Number);
    const totalMinutes = parts[0] * 60 + parts[1] + minutes;
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setStopBlocks([]);
    setSelectedSlotId(null);
    setOperation('idle');
    loadInitialData();
  }, []);

  function handleLogout() {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  }

  function handleSlotSelect(slotId: string) {
    if (selectedSlotId === slotId) return;
    setSelectedSlotId(slotId);
    setOperation('idle');
  }

  function handleOperationPress() {
    switch (operation) {
      case 'idle':
        setOperation('running');
        break;
      case 'running':
        Alert.alert('운행 종료', '운행을 종료하시겠습니까?', [
          { text: '취소', style: 'cancel' },
          {
            text: '종료',
            style: 'destructive',
            onPress: () => setOperation('ended'),
          },
        ]);
        break;
    }
  }

  function handleCall(phone: string) {
    if (!phone) {
      Alert.alert('알림', '전화번호가 등록되어 있지 않습니다.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  }

  function getRouteTypeLabel(routeType: string): string {
    switch (routeType) {
      case 'pickup':
        return '등원';
      case 'dropoff':
        return '하원';
      default:
        return routeType;
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  const totalStudents = stopBlocks.reduce(
    (sum, b) => sum + b.students.length,
    0
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Driver Info Header */}
        <View style={styles.driverHeader}>
          <View style={styles.driverInfo}>
            <Ionicons name="bus" size={22} color="#0066CC" />
            <Text style={styles.driverName}>{driverName || '기사님'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#64748B" />
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* Time Slot Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>운행 슬롯 선택</Text>
          {timeSlots.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                등록된 운행 슬롯이 없습니다
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.slotScrollContent}
            >
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotPill,
                    selectedSlotId === slot.id && styles.slotPillSelected,
                  ]}
                  onPress={() => handleSlotSelect(slot.id)}
                >
                  <Text
                    style={[
                      styles.slotPillType,
                      selectedSlotId === slot.id &&
                        styles.slotPillTextSelected,
                    ]}
                  >
                    {getRouteTypeLabel(slot.route_type)}
                  </Text>
                  <Text
                    style={[
                      styles.slotPillTime,
                      selectedSlotId === slot.id &&
                        styles.slotPillTextSelected,
                    ]}
                  >
                    {slot.departure_time}
                  </Text>
                  <Text
                    style={[
                      styles.slotPillLabel,
                      selectedSlotId === slot.id &&
                        styles.slotPillTextSelected,
                    ]}
                  >
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Route Blocks / Student List */}
        {selectedSlotId && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                탑승 학생
              </Text>
              {!loadingBlocks && (
                <Text style={styles.studentCount}>{totalStudents}명</Text>
              )}
            </View>

            {loadingBlocks ? (
              <ActivityIndicator
                size="small"
                color="#0066CC"
                style={{ marginTop: 20 }}
              />
            ) : stopBlocks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  배정된 노선이 없습니다
                </Text>
              </View>
            ) : (
              stopBlocks.map((block) => (
                <View key={block.blockId} style={styles.stopCard}>
                  <View style={styles.stopHeader}>
                    <Text style={styles.stopTime}>{block.time}</Text>
                    <Text style={styles.stopLabel}>{block.label}</Text>
                  </View>

                  {block.students.length === 0 ? (
                    <Text style={styles.noStudentText}>
                      탑승 학생 없음
                    </Text>
                  ) : (
                    block.students.map((student) => (
                      <View key={student.id} style={styles.studentRow}>
                        <Ionicons
                          name="person"
                          size={16}
                          color="#64748B"
                        />
                        <Text style={styles.studentName}>
                          {student.name}
                        </Text>
                        {student.phone ? (
                          <TouchableOpacity
                            style={styles.phoneButton}
                            onPress={() => handleCall(student.phone)}
                          >
                            <Ionicons
                              name="call"
                              size={18}
                              color="#0066CC"
                            />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.phoneButton}>
                            <Ionicons
                              name="call"
                              size={18}
                              color="#CBD5E1"
                            />
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Operation Button - Sticky Bottom */}
      {selectedSlotId && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.operationButton,
              operation === 'idle' && styles.operationIdle,
              operation === 'running' && styles.operationRunning,
              operation === 'ended' && styles.operationEnded,
            ]}
            onPress={handleOperationPress}
            disabled={operation === 'ended'}
            activeOpacity={0.8}
          >
            <Text style={styles.operationButtonText}>
              {operation === 'idle' && '운행 시작'}
              {operation === 'running' && '운행중…'}
              {operation === 'ended' && '운행 종료'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Driver Header
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066CC',
  },

  // Slot Pills
  slotScrollContent: {
    gap: 10,
    paddingVertical: 4,
  },
  slotPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  slotPillSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  slotPillType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  slotPillTime: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  slotPillLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },
  slotPillTextSelected: {
    color: '#FFFFFF',
  },

  // Stop Cards
  stopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stopTime: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0066CC',
  },
  stopLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  noStudentText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Student Rows
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  phoneButton: {
    padding: 8,
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Bottom Operation Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#F8FAFC',
  },
  operationButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  operationIdle: {
    backgroundColor: '#0066CC',
    shadowColor: '#0066CC',
  },
  operationRunning: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
  },
  operationEnded: {
    backgroundColor: '#94A3B8',
    shadowColor: '#94A3B8',
  },
  operationButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
